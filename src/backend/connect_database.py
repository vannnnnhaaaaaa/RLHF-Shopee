from src.backend.config import DB_URL 
from sqlmodel import SQLModel , create_engine , Session
from sqlalchemy import text 

from src.backend.models import Product, Feedback , ChatMessage , User , Task , TaskResult , FinalResult ,   Map , Shipping , Bill , BillDetail, Customer , Seller , Warehouse ,  Voucher , Review , CartItem 

postgres_url = "postgresql://postgres.sdewwbxjtcwhathhcfbf:ta39q8FOx519pFmx@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

engine = create_engine(postgres_url , pool_pre_ping=True)

def init() :
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    SQLModel.metadata.create_all(engine)
    

def get_session() :
    """
    Cấp 1 phiên làm việc và tự động đóng khi xong việc
    """
    with Session(engine) as session :
        yield session

if __name__ == '__main__':
    init()