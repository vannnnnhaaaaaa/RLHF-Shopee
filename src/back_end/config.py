import os 
from dotenv import load_dotenv
import streamlit as st
from sentence_transformers import SentenceTransformer
#1. load cac bien bi mat tu file .env
load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATA_DIR = os.path.join(BASE_DIR, "data")

RAW_DATA = os.path.join(DATA_DIR , 'raw_data')

CSV_PATH = os.path.join(RAW_DATA , "shopee.csv")

DB_URL = f"sqlite:///{os.path.join(DATA_DIR, 'shoppe.db')}"

VECTOR_DB_DIR =  os.path.join(DATA_DIR , "vector_store") 

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
@st.cache_resource
def get_embedding_model():
    print("🧠 Đang nạp Model AI vào RAM (Dùng chung cho toàn hệ thống)...")
    # Tải model 1 lần duy nhất và giữ trong RAM
    return SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
EMBEDDING_MODEL = get_embedding_model()