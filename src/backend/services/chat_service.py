from src.backend.graph.workflow import app as graph
from src.backend.schemas import ChatRequest
from src.backend.connect_database import get_session
from src.backend.models import ChatMessage

from sqlmodel import Session
import re

class Chatservice :
    @staticmethod
    def extract_product_ids(text: str):
        """
        Trích xuất danh sách product IDs từ văn bản answer
        Tìm dòng: SELECTED_PRODUCTS: 285, 22, ...
        """
        try:
            match = re.search(r'SELECTED_PRODUCTS:\s*([\d\s,]+)', text, re.IGNORECASE)
            if match:
                ids_str = match.group(1)
                product_ids = [int(id.strip()) for id in ids_str.split(',') if id.strip().isdigit()]
                return product_ids if product_ids else None
        except Exception as e:
            print(f"⚠️ Error extracting product IDs: {e}")
        return None
    
    @staticmethod
    async def create_response_ai (request : ChatRequest , session : Session ) :
        init_state = {
            'question' : request.question ,
            'thread_id' : request.thread_id ,
            'history' : request.history or []
        }    
        try :
            state_result = await graph.ainvoke(init_state)
            answer_ai = state_result.get('answer') or 'xin lỗi hiện tại AI đang gặp vấn đề'
       
            # 🆕 Trích xuất danh sách product IDs từ answer
            suggested_product_ids = Chatservice.extract_product_ids(answer_ai)
            
            human_message = ChatMessage(
                thread_id=request.thread_id,
                role='human' ,
                content=request.question
            )

            ai_message = ChatMessage(
                thread_id=request.thread_id ,
                role='ai',
                content=answer_ai,
                suggested_product_ids=suggested_product_ids  # 🆕 Lưu danh sách product IDs
            )
            session.add(human_message)
            session.add(ai_message)
            session.commit()
            session.refresh(ai_message)
            return ai_message 
        except Exception as e :
            session.rollback()
            raise e