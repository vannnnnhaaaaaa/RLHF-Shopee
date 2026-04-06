from langchain_groq import ChatGroq
from core.logger import system_logger
from core.exception import LoadModelError
from config.settings import settings

from langchain_community.embeddings import HuggingFaceEmbeddings 
from langchain_core.language_models.chat_models import BaseChatModel
class ShopeeAIManager : 
    def __init__(self) :
        self.models = {
            "ChatGroq 3-70" : ChatGroq(model='llama-3.1-8b-instant' , temperature=0.2 , api_key=settings.GROQ_API_KEY)
        }
        self.embedding_model = HuggingFaceEmbeddings(
            model_name ="keepitreal/vietnamese-sbert" 
        )
        self.default_model_name = "ChatGroq 3-70"

    def set_activate_model(self , model_name : str = 'ChatGroq 3-70') -> None:
        if model_name in self.models :
            self.default_model_name = model_name 
            system_logger.info(f"đã đổi sang model {model_name}")
        else :
            raise LoadModelError(message=f"Gặp lỗi khi dùng model {model_name} , vui lòng xài model khác")
        
    def get_llm (self) -> BaseChatModel : 
        model_name = self.default_model_name
        return self.models.get(model_name)
    
    def get_model_embedding (self)  :
        return self.embedding_model

    def get_all_llm (self) -> dict[str , BaseChatModel]:
        return self.models 
    
agent_manager = ShopeeAIManager()