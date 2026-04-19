from langchain_groq import ChatGroq
from langchain_google_genai import GoogleGenerativeAIEmbeddings # Import thư viện mới của Google
from langchain_core.language_models.chat_models import BaseChatModel

from src.backend.chatbot_assitant.core.logger import system_logger
from src.backend.chatbot_assitant.core.exception import LoadModelError
from src.backend.chatbot_assitant.config.settings import settings

class ShopeeAIManager: 
    def __init__(self):
        # 1. LLM Model (Chạy bằng Groq - Cực nhanh)
        self.models = {
            "ChatGroq 3-70": ChatGroq(
                model='llama-3.1-8b-instant', 
                temperature=0.2, 
                api_key=settings.GROQ_API_KEY
            )
        }
        
        # 2. Embedding Model (Chạy bằng Google API - 100% Cloud, máy siêu nhẹ)
        self.embedding_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=settings.GOOGLE_API_KEY,
        task_type="retrieval_document",
        output_dimensionality=384
        )
        
        self.default_model_name = "ChatGroq 3-70"

    def set_activate_model(self, model_name: str = 'ChatGroq 3-70') -> None:
        if model_name in self.models:
            self.default_model_name = model_name 
            system_logger.info(f"Đã đổi sang model {model_name}")
        else:
            raise LoadModelError(message=f"Gặp lỗi khi dùng model {model_name}, vui lòng xài model khác")
        
    def get_llm(self) -> BaseChatModel: 
        model_name = self.default_model_name
        return self.models.get(model_name)
    
    def get_model_embedding(self):
        return self.embedding_model

    def get_all_llm(self) -> dict[str, BaseChatModel]:
        return self.models 
    
agent_manager = ShopeeAIManager()