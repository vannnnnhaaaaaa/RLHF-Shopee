from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages 
from langchain_core.messages import BaseMessage, AIMessage , SystemMessage
from sqlalchemy import select 
from sqlmodel import Session
import re
from src.backend.models import Product
from src.backend.chatbot_assitant.core.logger import system_logger
from src.backend.chatbot_assitant.graph.legal_agent import ShopeeAIManager 
from src.backend.chatbot_assitant.schema import RouterOutputFiltering , ProductFilters
from src.backend.chatbot_assitant.graph.prompt import prompt_router_and_extract_filter , prompt_response_ai

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    intent: str
    extracted_filters: dict
    search_results: list[dict]


# ==========================================================
# 2. KHAI BÁO CÁC NODE (BẠN SẼ CODE LOGIC VÀO ĐÂY)
# ==========================================================

class ShopeeBotWorkflow :
    def __init__ (self, agent_manager: ShopeeAIManager , session : Session) :
        self.agent_manager = agent_manager
        self.session = session
    def _router_extractor_node(self , state: AgentState):
        """Node 1: Đọc tin nhắn, phân loại ý định và trích xuất bộ lọc"""
        system_logger.info("[Node 1] Đang phân tích...")
        
        # TODO 1: Áp dụng Sliding Window (Cắt state["messages"] lấy 6 tin gần nhất)
        recent_messages = state["messages"][-6:]
        system_prompt = SystemMessage(prompt_router_and_extract_filter)
        final_message = [system_prompt] + recent_messages

        # TODO 2: Lấy LLM từ agent_manager và dùng with_structured_output
        llm = self.agent_manager.get_llm()
        llm_with_structured_output =  llm.with_structured_output(RouterOutputFiltering)

        # TODO 3: Gọi LLM (truyền mảng messages đã cắt)
        result   = llm_with_structured_output.invoke(final_message)

        filters_dict = {}
        if result.filters :
            filters_dict = result.filters.model_dump(exclude_none=True)
        return {
            "intent": result.intent, # hoặc "greeting", "out_of_scope"
            "extracted_filters":filters_dict     # Điền dict filter vào đây
        }
   

    def _postgres_search_node(self, state: AgentState):
        """Node 2: Nhận filter, tìm kiếm Hybrid trong DB (Lexical + Semantic + RRF)"""
        system_logger.info("==========================================")
        system_logger.info("[Node 2] BẮT ĐẦU LUỒNG TÌM KIẾM HYBRID")
        
        filters: dict = state.get('extracted_filters', {})
        system_logger.info(f"[Node 2] Filters nhận được: {filters}")

        # ---------------------------------------------------------
        # BƯỚC 1: CLEAN METADATA (Tiền xử lý query)
        # ---------------------------------------------------------
        raw_text_parts = []
        if "search_text" in filters:
            raw_text_parts.append(str(filters['search_text']))
        if 'attributes' in filters:
            for key, value in filters["attributes"].items():
                raw_text_parts.append(str(value))
                
        raw_query = " ".join(raw_text_parts)
        
        clean_query = re.sub(r'[^\w\s]', ' ', raw_query)
        clean_query = " ".join(clean_query.split()).strip()
        
        system_logger.info(f"[Node 2 - Bước 1] Cleaned Query: '{clean_query}'")

        # ---------------------------------------------------------
        # BƯỚC 2: PRE-FILTERING (Lọc cứng Metadata)
        # ---------------------------------------------------------
        base_stmt = select(Product)
        if 'max_price' in filters:
            base_stmt = base_stmt.where(Product.price <= filters['max_price'])
        if 'min_price' in filters:
            base_stmt = base_stmt.where(Product.price >= filters['min_price'])
        if "category" in filters:
            base_stmt = base_stmt.where(Product.category.ilike(f"%{filters['category']}%"))

        # Nếu người dùng không nhập gì để search (chỉ lọc), bỏ qua Hybrid
        if not clean_query:
            system_logger.info("[Node 2] Không có từ khóa tìm kiếm, chỉ áp dụng Base Filter.")
            db_products = self.session.exec(base_stmt.limit(5)).all()
            # FIX TẠI ĐÂY: Phải bọc trong dict có key "search_results"
            return {"search_results": self._format_db_results(db_products)}

        real_db_results = []
        
        try:
            # ---------------------------------------------------------
            # BƯỚC 3: LEXICAL SEARCH (BM25-style Keyword Retrieval)
            # ---------------------------------------------------------
            system_logger.info("[Node 2 - Bước 3] Thực thi Lexical Search (Khớp từ khóa)...")
            lexical_stmt = base_stmt.where(Product.name.ilike(f"%{clean_query}%")).limit(10)
            lexical_results = self.session.exec(lexical_stmt).all()
            system_logger.info(f" -> Lexical tìm thấy {len(lexical_results)} sản phẩm.")

            # ---------------------------------------------------------
            # BƯỚC 4: SEMANTIC SEARCH (Vector Similarity)
            # ---------------------------------------------------------
            system_logger.info("[Node 2 - Bước 4] Thực thi Semantic Search (Vector)...")
            model_embedding = self.agent_manager.get_model_embedding()
            query_embedding = model_embedding.embed_query(text=clean_query)
            
            semantic_stmt = base_stmt.order_by(
                Product.embedding.cosine_distance(query_embedding)
            ).limit(10)
            semantic_results = self.session.exec(semantic_stmt).all()
            system_logger.info(f" -> Semantic tìm thấy {len(semantic_results)} sản phẩm.")

            # ---------------------------------------------------------
            # BƯỚC 5: MERGE & RERANK (Reciprocal Rank Fusion - RRF)
            # ---------------------------------------------------------
            system_logger.info("[Node 2 - Bước 5] Merge và Rerank bằng thuật toán RRF...")
            
            k = 60 
            scores = {}
            product_catalog = {} 

            for rank, p in enumerate(lexical_results):
                product_obj = p[0] if isinstance(p, tuple) else p
                pid = product_obj.id
                product_catalog[pid] = product_obj
                scores[pid] = scores.get(pid, 0.0) + (1.0 / (k + rank + 1))

            for rank, p in enumerate(semantic_results):
                product_obj = p[0] if isinstance(p, tuple) else p
                pid = product_obj.id
                product_catalog[pid] = product_obj
                scores[pid] = scores.get(pid, 0.0) + (1.0 / (k + rank + 1))

            ranked_pids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
            
            top_5_pids = ranked_pids[:5]
            final_products = [product_catalog[pid] for pid in top_5_pids]
            system_logger.info(f" -> Rerank thành công. Lấy top {len(final_products)} sản phẩm.")

            # ---------------------------------------------------------
            # BƯỚC 6: FALLBACK LOGIC
            # ---------------------------------------------------------
            if not final_products:
                system_logger.warning("[Node 2 - Bước 6] FALLBACK: Không tìm thấy kết quả Hybrid. Mở rộng tìm kiếm...")
                fallback_stmt = base_stmt.limit(5)
                final_products = self.session.exec(fallback_stmt).all()
                system_logger.info(f" -> Fallback tìm thấy {len(final_products)} sản phẩm thay thế.")

            real_db_results = self._format_db_results(final_products)

        except Exception as e:
            system_logger.error(f"[Node 2 - LỖI CRITICAL] Truy vấn DB thất bại: {e}")
            real_db_results = []

        system_logger.info("==========================================")
        return {
            "search_results": real_db_results
        }
    def _format_db_results(self, db_products) -> list[dict]:
        """Hàm phụ trợ để parse dữ liệu DB thành list dictionary sạch sẽ"""
        results = []
        for p in db_products:
            product_obj = p[0] if isinstance(p, tuple) else p
            results.append({
                "id": getattr(product_obj, "id", None),
                "name": getattr(product_obj, "name", ""),
                "price": getattr(product_obj, "price", 0),
            })
        return results
    def _generator_node(self ,state: AgentState):
        """Node 3: Trả lời khách hàng dựa trên kết quả"""
        system_logger.info("[Node 3] Đang sinh câu trả lời...")

        # Kiểm tra state
        intent = state.get('intent')
        search_results = state.get('search_results' , [])
        messages = state.get("messages", [])[-6:]
        
        # Đọc state.get("search_results")
        results_text = "Trống (Không tìm thấy sản phẩm)"
        if search_results:
            results_text = "\n".join([f"- {item['name']} (Giá: {item['price']}đ) - ID: {item['id']}" for item in search_results])

        # FIX TẠI ĐÂY: KHÔI PHỤC ĐOẠN GỌI LLM BỊ MẤT
        dynamic_system_prompt = f"""
            {prompt_response_ai}

            --- THÔNG TIN TỪ HỆ THỐNG ---
            - Intent của khách hàng: {intent}
            - Danh sách kết quả tìm được: 
            {results_text}
        """
        system_msg = SystemMessage(content=dynamic_system_prompt)
        final_message = [system_msg] + messages
        response = self.agent_manager.get_llm().invoke(final_message)

        return {"messages": [response]}
    def _route_after_extract(self ,state: AgentState ) -> Literal["search", "generate"]:
        """Quyết định đi tiếp vào Database hay đi thẳng ra trả lời"""
        intent = state.get("intent")

        if intent == "search_product":
            return "search"
        return "generate"
    
    def build_chatbot_graph(self):
        workflow = StateGraph(AgentState)

        # FIX TẠI ĐÂY: Gọi tên hàm chuẩn xác và phải có self. đi kèm
        workflow.add_node("router", self._router_extractor_node)
        workflow.add_node("search", self._postgres_search_node)
        workflow.add_node("generate", self._generator_node)

        workflow.add_edge(START, "router")

        workflow.add_conditional_edges(
            "router",
            self._route_after_extract, 
            {
                "search": "search",
                "generate": "generate"
            }
        )

        workflow.add_edge("search", "generate")
        workflow.add_edge("generate", END)

        return workflow.compile()




