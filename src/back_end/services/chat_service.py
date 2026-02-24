from src.back_end.graph.workflow import app as graph
from src.back_end.schemas import ChatRequest
from src.back_end.connect_database import get_session
from src.back_end.models import ChatMessage

from sqlmodel import Session

class Chatservice :
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
       
            human_message = ChatMessage(
                thread_id=request.thread_id,
                role='human' ,
                content=request.question
            )

            ai_message = ChatMessage(
                thread_id=request.thread_id ,
                role='ai',
                content=answer_ai
            )
            session.add(human_message)
            session.add(ai_message)
            session.commit()
            session.refresh(ai_message)
            return ai_message 
        except Exception as e :
            session.rollback()
            raise e