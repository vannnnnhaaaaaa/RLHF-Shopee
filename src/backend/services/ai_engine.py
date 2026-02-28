from src.back_end.config import GROQ_API_KEY
from langchain_groq import ChatGroq
from sentence_transformers import SentenceTransformer
from functools import lru_cache



@lru_cache()
def get_llm():
    print("⏳ Đang khởi tạo kết nối LLM (Chỉ chạy lần đầu tiên)...")
    model = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.2,
        api_key=GROQ_API_KEY
    )
    return model

@lru_cache()
def get_model_embedding():
    print("⏳ Đang nạp Model Embedding vào RAM (Chờ xíu)...")
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    return model