from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, SystemMessage, AIMessage
from sqlalchemy import select
from sqlmodel import Session
import re

from src.backend.models import Product
from src.backend.chatbot_assistant.core.logger import system_logger
from src.backend.chatbot_assistant.graph.legal_agent import ShopeeAIManager
from src.backend.chatbot_assistant.schema import RouterOutputFiltering, ProductFilters
from src.backend.chatbot_assistant.graph.prompt import (
    prompt_router_and_extract_filter,
    prompt_greeting,
    prompt_out_of_scope,
    prompt_product_response,
    prompt_law_response,
)


# ==========================================================
# BƯỚC 1: ĐỊNH NGHĨA STATE (GraphState TypedDict)
# ==========================================================
class AgentState(TypedDict):
    """Trạng thái chia sẻ giữa tất cả các Node trong Graph."""
    messages: Annotated[list[BaseMessage], add_messages]
    intent: str
    extracted_filters: dict
    search_results: list[dict]
    law_results: list[dict]   # Kết quả vector search từ collection policies
    question: str             # Câu hỏi thuần (lấy từ tin nhắn gốc)


# ==========================================================
# BƯỚC 2: HELPER — Trích câu hỏi từ messages
# ==========================================================
def _get_latest_question(state: AgentState) -> str:
    """Lấy nội dung tin nhắn mới nhất của khách."""
    msgs = state.get("messages", [])
    if msgs:
        last = msgs[-1]
        return getattr(last, "content", "") or ""
    return ""


# ==========================================================
# BƯỚC 3: KHỞI TẠO CLASS WORKFLOW
# ==========================================================
class ShopeeBotWorkflow:
    def __init__(self, agent_manager: ShopeeAIManager, session: Session):
        self.agent_manager = agent_manager
        self.session = session

    # ------------------------------------------------------------
    # NODE 1: Router — LLM phân loại intent + trích filters
    # ------------------------------------------------------------
    def _router_node(self, state: AgentState):
        """
        Node Router: Đọc tin nhắn mới nhất, phân loại intent (4 loại),
        trích xuất filters (nếu là search_product).
        """
        system_logger.info("[Router] Dang phan tich y dinh...")

        recent = state["messages"][-6:]
        system_prompt = SystemMessage(content=prompt_router_and_extract_filter)
        llm = self.agent_manager.get_llm().with_structured_output(RouterOutputFiltering)
        result = llm.invoke([system_prompt] + recent)

        filters_dict = {}
        if result.filters:
            filters_dict = result.filters.model_dump(exclude_none=True)

        question = _get_latest_question(state)

        system_logger.info(f"[Router] -> Intent: {result.intent}")
        return {
            "intent": result.intent,
            "extracted_filters": filters_dict,
            "question": question,
        }

    # ------------------------------------------------------------
    # NODE 2: Handle Greeting — Không gọi DB, tiết kiệm chi phí
    # ------------------------------------------------------------
    def _greeting_node(self, state: AgentState):
        """
        Node greeting: Đáp lại thân thiện và dẫn dắt khách vào mua sắm.
        Không truy vấn database.
        """
        system_logger.info("[Node Greeting] Dang tra loi chao hoi...")

        msgs = state.get("messages", [])[-3:]
        system_prompt = SystemMessage(content=prompt_greeting)
        llm = self.agent_manager.get_llm()
        response = llm.invoke([system_prompt] + msgs)

        system_logger.info("[Node Greeting] Hoan thanh -> END")
        return {"messages": [response]}

    # ------------------------------------------------------------
    # NODE 3: Handle Out of Scope — Từ chối khéo léo
    # ------------------------------------------------------------
    def _out_of_scope_node(self, state: AgentState):
        """
        Node out_of_scope: Từ chối câu hỏi ngoài phạm vi,
        bẻ lái khách quay lại mua sắm.
        Không truy vấn database.
        """
        system_logger.info("[Node OutOfScope] Dang tu choi...")

        msgs = state.get("messages", [])[-3:]
        system_prompt = SystemMessage(content=prompt_out_of_scope)
        llm = self.agent_manager.get_llm()
        response = llm.invoke([system_prompt] + msgs)

        system_logger.info("[Node OutOfScope] Hoan thanh -> END")
        return {"messages": [response]}

    # ------------------------------------------------------------
    # NODE 4: Search Product — Hybrid (BM25 Keyword + Vector + RRF)
    # ------------------------------------------------------------
    def _search_product_node(self, state: AgentState):
        """
        Node search_product: Hybrid Search (Lexical + Semantic + RRF Rerank).
        Truy vấn bảng Product trong PostgreSQL.
        Kết quả lưu vào search_results.
        """
        system_logger.info("=" * 50)
        system_logger.info("[Node SearchProduct] BAT DAU TIM KIEM HYBRID")

        filters: dict = state.get("extracted_filters", {})
        system_logger.info(f"[Node SearchProduct] Filters: {filters}")

        # ---- Bước 1: Clean query ----
        raw_parts = []
        if search_text := filters.get("search_text"):
            raw_parts.append(str(search_text))
        if attrs := filters.get("attributes"):
            raw_parts.extend(str(v) for v in attrs.values())
        clean_query = " ".join(raw_parts).strip()
        clean_query = re.sub(r"[^\w\s]", " ", clean_query)
        clean_query = " ".join(clean_query.split())

        system_logger.info(f"[Node SearchProduct] Cleaned query: '{clean_query}'")

        # ---- Bước 2: Pre-filter ----
        base_stmt = select(Product)
        if max_p := filters.get("max_price"):
            base_stmt = base_stmt.where(Product.price <= max_p)
        if min_p := filters.get("min_price"):
            base_stmt = base_stmt.where(Product.price >= min_p)
        if cat := filters.get("category"):
            base_stmt = base_stmt.where(Product.category.ilike(f"%{cat}%"))

        # Không có từ khóa → chỉ filter
        if not clean_query:
            system_logger.info("[Node SearchProduct] Khong co tu khoa, chi ap dung filter.")
            products = self.session.exec(base_stmt.limit(5)).all()
            return {"search_results": self._format_products(products)}

        try:
            # ---- Bước 3: Lexical (BM25-style) ----
            system_logger.info("[Node SearchProduct] -> Lexical Search...")
            lexical_stmt = base_stmt.where(Product.name.ilike(f"%{clean_query}%")).limit(10)
            lexical = self.session.exec(lexical_stmt).all()
            system_logger.info(f"[Node SearchProduct] -> Lexical: {len(lexical)} ket qua")

            # ---- Bước 4: Semantic (Vector Cosine Distance) ----
            system_logger.info("[Node SearchProduct] -> Semantic Search...")
            embed = self.agent_manager.get_model_embedding()
            q_emb = embed.embed_query(text=clean_query)
            semantic_stmt = (
                base_stmt
                .order_by(Product.embedding.cosine_distance(q_emb))
                .limit(10)
            )
            semantic = self.session.exec(semantic_stmt).all()
            system_logger.info(f"[Node SearchProduct] -> Semantic: {len(semantic)} ket qua")

            # ---- Bước 5: RRF Rerank (k=60) ----
            system_logger.info("[Node SearchProduct] -> RRF Reranking...")
            k = 60
            scores: dict = {}
            catalog: dict = {}

            for rank, p in enumerate(lexical):
                obj = p[0] if isinstance(p, tuple) else p
                catalog[obj.id] = obj
                scores[obj.id] = scores.get(obj.id, 0.0) + (1.0 / (k + rank + 1))

            for rank, p in enumerate(semantic):
                obj = p[0] if isinstance(p, tuple) else p
                catalog[obj.id] = obj
                scores[obj.id] = scores.get(obj.id, 0.0) + (1.0 / (k + rank + 1))

            ranked = sorted(scores, key=scores.get, reverse=True)[:5]
            final = [catalog[pid] for pid in ranked]
            system_logger.info(f"[Node SearchProduct] -> Top {len(final)} san pham sau rerank")

            # ---- Bước 6: Fallback ----
            if not final:
                system_logger.warning("[Node SearchProduct] FALLBACK: Mo rong tim kiem...")
                final = self.session.exec(base_stmt.limit(5)).all()

            results = self._format_products(final)

        except Exception as e:
            system_logger.error(f"[Node SearchProduct] LOI: {e}")
            results = []

        system_logger.info("=" * 50)
        return {"search_results": results}

    # ------------------------------------------------------------
    # NODE 5: Search Law — Semantic Vector Search (policies)
    # ------------------------------------------------------------
    def _search_law_node(self, state: AgentState):
        """
        Node search_law: Semantic Vector Search trên collection 'policies'.
        Hiện tại dùng BM25/keyword trên Product.description làm mock
        (vì chưa có Vector DB riêng cho policies).
        Thay thế bằng Qdrant / Chroma / Pinecone khi có Vector DB.
        """
        system_logger.info("=" * 50)
        system_logger.info("[Node SearchLaw] BAT DAU TIM KIEM CHINH SACH")

        question = state.get("question", "")
        if not question:
            system_logger.warning("[Node SearchLaw] Khong co cau hoi.")
            return {"law_results": []}

        try:
            embed = self.agent_manager.get_model_embedding()
            q_emb = embed.embed_query(text=question)

            # Mock: Tìm kiếm trong description của Product vì chưa có bảng policies
            # Khi có Vector DB: stmt = select(Policy).order_by(Policy.embedding.cosine_distance(q_emb)).limit(3)
            stmt = (
                select(Product)
                .where(
                    Product.description.isnot(None),
                    Product.description != ""
                )
                .order_by(Product.embedding.cosine_distance(q_emb))
                .limit(3)
            )
            results = self.session.exec(stmt).all()

            # Định dạng: lấy name + description làm "chính sách"
            law_context = []
            for r in results:
                obj = r[0] if isinstance(r, tuple) else r
                law_context.append({
                    "title": getattr(obj, "name", "Khong co tieu de"),
                    "content": getattr(obj, "description", ""),
                    "id": getattr(obj, "id", None),
                })

            system_logger.info(f"[Node SearchLaw] -> Tim thay {len(law_context)} dieu khoan")
            system_logger.info("=" * 50)
            return {"law_results": law_context}

        except Exception as e:
            system_logger.error(f"[Node SearchLaw] LOI: {e}")
            return {"law_results": []}

    # ------------------------------------------------------------
    # NODE 6: Generate Greeting Response
    # ------------------------------------------------------------
    def _generate_greeting_node(self, state: AgentState):
        """
        Generator cho nhánh greeting — gọi LLM với prompt_greeting.
        """
        system_logger.info("[Node GenerateGreeting] Dang sinh phan hoi...")
        msgs = state.get("messages", [])[-3:]
        system_prompt = SystemMessage(content=prompt_greeting)
        response = self.agent_manager.get_llm().invoke([system_prompt] + msgs)
        return {"messages": [response]}

    # ------------------------------------------------------------
    # NODE 7: Generate Product Response
    # ------------------------------------------------------------
    def _generate_product_node(self, state: AgentState):
        """
        Generator cho nhánh search_product.
        Định dạng trả về tương thích với MessageFormatter:
          - Phần chat: text thuần (không emoji), dùng số thứ tự 1. 2. 3.
          - Cuối cùng: dòng SELECTED_PRODUCTS: để frontend parse ID + tạo link clickable
        """
        system_logger.info("[Node GenerateProduct] Dang sinh phan hoi san pham...")

        search_results = state.get("search_results", [])
        msgs = state.get("messages", [])[-3:]

        # ---- LLM sinh phần chat ----
        if search_results:
            results_text = "\n".join(
                f"{i+1}. {r['name']} - Gia: {r['price']:,.0f} VND - Da ban: {r['sold_count']}"
                for i, r in enumerate(search_results)
            )
        else:
            results_text = "Khong tim thay san pham phu hop."

        dynamic_prompt = f"""
{prompt_product_response}

--- KET QUA TIM KIEM SAN PHAM ---
{results_text}
"""
        system_msg = SystemMessage(content=dynamic_prompt)
        chat_response = self.agent_manager.get_llm().invoke([system_msg] + msgs)

        # ---- Gom chat + product IDs thành 1 response cuối cùng ----
        if search_results:
            product_ids = ", ".join(str(r["id"]) for r in search_results)
            final_text = f"{chat_response.content.strip()}\n\nSELECTED_PRODUCTS: {product_ids}"
        else:
            final_text = chat_response.content.strip()

        final_response = AIMessage(content=final_text)

        system_logger.info("[Node GenerateProduct] Hoan thanh")
        return {"messages": [final_response]}

    # ------------------------------------------------------------
    # NODE 8: Generate Law Response — STRICT: chỉ dựa trên context
    # ------------------------------------------------------------
    def _generate_law_node(self, state: AgentState):
        """
        Generator cho nhánh search_law:
        Đọc law_results → LLM trả lời STRICT (no hallucination).
        """
        system_logger.info("[Node GenerateLaw] Dang sinh phan hoi phap ly...")

        law_results = state.get("law_results", [])
        msgs = state.get("messages", [])[-3:]

        if law_results:
            context_text = "\n".join(
                f"  Dieu {i+1}: {r['title']}\n     {r['content'][:300]}..."
                for i, r in enumerate(law_results)
            )
        else:
            context_text = "Khong tim thay thong tin phap ly lien quan."

        dynamic_prompt = f"""
{prompt_law_response}

--- NGỮ CẢNH PHÁP LÝ ---
{context_text}
"""
        system_msg = SystemMessage(content=dynamic_prompt)
        response = self.agent_manager.get_llm().invoke([system_msg] + msgs)
        system_logger.info("[Node GenerateLaw] Hoan thanh")
        return {"messages": [response]}

    # ------------------------------------------------------------
    # BƯỚC 4: CONDITIONAL EDGE — Điều hướng sau Router
    # ------------------------------------------------------------
    def _route_after_router(self, state: AgentState) -> Literal[
        "greeting", "out_of_scope", "search_product", "search_law"
    ]:
        """
        Đọc intent từ state → điều hướng Graph vào đúng Node.
        """
        intent = state.get("intent", "")
        system_logger.info(f"[ConditionalEdge] intent = '{intent}' -> routing...")

        routes = {
            "greeting":       "greeting",
            "out_of_scope":   "out_of_scope",
            "search_product": "search_product",
            "search_law":     "search_law",
        }
        return routes.get(intent, "out_of_scope")

    # ------------------------------------------------------------
    # BƯỚC 5: BUILD & COMPILE GRAPH
    # ------------------------------------------------------------
    def build_chatbot_graph(self):
        """
        Lắp ráp toàn bộ StateGraph:
        START → router → [4 nhánh] → END
        """
        workflow = StateGraph(AgentState)

        # --- Thêm 8 Node ---
        workflow.add_node("router",            self._router_node)
        workflow.add_node("greeting",          self._greeting_node)
        workflow.add_node("out_of_scope",       self._out_of_scope_node)
        workflow.add_node("search_product",    self._search_product_node)
        workflow.add_node("search_law",        self._search_law_node)
        workflow.add_node("generate_greeting",  self._generate_greeting_node)
        workflow.add_node("generate_product",   self._generate_product_node)
        workflow.add_node("generate_law",      self._generate_law_node)

        # --- START → Router ---
        workflow.add_edge(START, "router")

        # --- Router → 4 nhánh (Conditional Edge) ---
        workflow.add_conditional_edges(
            "router",
            self._route_after_router,
            {
                "greeting":       "greeting",
                "out_of_scope":    "out_of_scope",
                "search_product":  "search_product",
                "search_law":      "search_law",
            }
        )

        # --- Nhánh greeting/out_of_scope → END (không qua generator) ---
        workflow.add_edge("greeting",      END)
        workflow.add_edge("out_of_scope",  END)

        # --- Nhánh search_product: search → generate → END ---
        workflow.add_edge("search_product",   "generate_product")
        workflow.add_edge("generate_product", END)

        # --- Nhánh search_law: search → generate → END ---
        workflow.add_edge("search_law",   "generate_law")
        workflow.add_edge("generate_law", END)

        system_logger.info("Graph da duoc lap rap: START -> router -> [4 nhanh] -> END")
        return workflow.compile()

    # ------------------------------------------------------------
    # HELPER: Định dạng kết quả sản phẩm
    # ------------------------------------------------------------
    def _format_products(self, db_products) -> list[dict]:
        """
        Parse Product objects → list[dict sạch có đủ thông tin].
        Lấy đủ: id, name, price, stock, category, description,
        image (từ images rel hoặc image_link), discount, sold_count, badge.
        """
        results = []
        for p in db_products:
            obj = p[0] if isinstance(p, tuple) else p

            # Lấy ảnh chính: ưu tiên is_primary=True trong images, fallback image_link
            image_url = getattr(obj, "image_link", "") or ""
            if hasattr(obj, "images") and obj.images:
                primary = next(
                    (img.image_url for img in obj.images if img.is_primary),
                    None
                )
                if primary:
                    image_url = primary
                elif obj.images and not image_url:
                    image_url = obj.images[0].image_url

            results.append({
                "id":               getattr(obj, "id",               None),
                "name":             getattr(obj, "name",             ""),
                "price":            getattr(obj, "price",            0),
                "stock":            getattr(obj, "stock",            0),
                "category":         getattr(obj, "category",         ""),
                "description":      getattr(obj, "description",     "")[:300],
                "image_url":        image_url,
                "discount_percent": getattr(obj, "discount_percent",  None),
                "sold_count":       getattr(obj, "sold_count",        0),
                "shop_badge":       getattr(obj, "shop_badge",       ""),
                "view_count":       getattr(obj, "view_count",       0),
            })
        return results
