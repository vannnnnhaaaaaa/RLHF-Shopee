from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages 
from langchain_core.messages import BaseMessage, AIMessage , SystemMessage
from sqlalchemy import select 

from backend.models import Product
from core.logger import system_logger
from graph.legal_agent import ShopeeAIManager 
from schema import RouterOutputFiltering , ProductFilters
from graph.prompt import prompt_router_and_extract_filter , prompt_response_ai

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    intent: str
    extracted_filters: dict
    search_results: list[dict]


# ==========================================================
# 2. KHAI BÁO CÁC NODE (BẠN SẼ CODE LOGIC VÀO ĐÂY)
# ==========================================================

class ShopeeBotWorkflow :
    def __init__ (self, agent_manager: ShopeeAIManager) :
        self.agent_manager = agent_manager

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
    
    def _postgres_search_node(self  , state: AgentState):
        """Node 2: Nhận filter, tìm kiếm Hybrid trong DB"""
        system_logger.info("[Node 2] Đang tìm kiếm trong Database...")

        # TODO 1: Lấy filters = state.get("extracted_filters", {})
        filters : ProductFilters = state.get('extracted_filters', {})
        # TODO 2: Viết logic lọc SQL cứng (Metadata pre-filtering)
        statement = select(Product)
        if 'max_price' in filters :
            statement = statement.where(Product.price <= filters['max_price'])
        if 'min_price' in filters :
            statement = statement.where(Product.price >= filters['min_price'])
        if "category" in filters:
            statement = statement.where(Product.category.ilike(f"%{filters['category']}%"))

        # TODO 3: Viết logic tìm kiếm Cosine Similarity bằng pgvector
        semantic_query_parts = []
        if "search_text" in filters :
            semantic_query_parts.append (filters['search_text'])

        if 'attributes' in filters :
            for key, value in filters["attributes"].items():
                semantic_query_parts.append(str(value))

        final_semantic_query = " ".join(semantic_query_parts)

        if final_semantic_query:
            system_logger.info(f" -> Đang chuyển hóa chuỗi '{final_semantic_query}' thành Vector để tìm kiếm...")
            model_embedding = self.agent_manager.get_model_embedding ()
            query_embedding = model_embedding.embed_query( text=final_semantic_query)

            statement = statement.order_by(Product.embedding.cosine_distance(query_embedding)).limit(5)
        else :
            statement = statement.limit(5)
        fake_db_results = [
            {"id": 1, "name": "Áo Test Hệ Thống", "price": 150000}
        ]
        return {
            "search_results": fake_db_results
        }

    
    def _generator_node(self ,state: AgentState):
        """Node 3: Trả lời khách hàng dựa trên kết quả"""
        system_logger.info("[Node 3] Đang sinh câu trả lời...")
        
        # TODO 1: Kiểm tra state.get("intent")
        intent = state.get('intent')
        search_results = state.get('search_results' , [])
        messages = state.get("messages", [])[-6:]
        # TODO 2: Nếu là search_product -> Đọc state.get("search_results")
        results_text = "Trống (Không tìm thấy sản phẩm)"
        if search_results :
            results_text = "\n".join([f"- {item['name']} (Giá: {item['price']}đ) - ID: {item['id']}" for item in search_results])

        # TODO 3: Gọi LLM sinh câu trả lời tự nhiên (truyền kết quả DB vào Prompt)
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

        # Dữ liệu giả định trả về (nhớ bọc trong AIMessage):
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




