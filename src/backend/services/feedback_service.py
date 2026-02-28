from src.backend.schemas import CreateFeedback 
from src.backend.models import Feedback , Task
from src.backend.services.ai_engine import get_llm 

from datetime import datetime 
from langchain_core.prompts import ChatPromptTemplate 
from langchain_core.output_parsers import StrOutputParser , JsonOutputParser
from sqlmodel import Session
from pydantic import BaseModel, Field
from typing import Literal

class EvalResult(BaseModel):
    score: int = Field(description="Điểm chất lượng cuộc trò chuyện trên thang điểm 10. 1 là rất tệ, 10 là hoàn hảo.")
    sentiment: Literal["Vui vẻ", "Trung tính", "Thất vọng", "Giận dữ"] = Field(
        description="Cảm xúc khách hàng"
    )
    root_cause: str = Field(description="Nguyên nhân chính nếu điểm dưới 8. Nếu điểm cao, ghi 'Không có lỗi'.")

async def evaluate_AI_feedback(history_chat: list, user_comment: str = ""):
    llm = get_llm()
    structured_llm = llm.with_structured_output(EvalResult)

    system_prompt = """
    Bạn là kiểm toán viên chất lượng AI. Hãy đánh giá cách AI phản hồi:
    1. Độ chính xác: AI có trích xuất đúng thông tin từ database không? (Ví dụ: giá, màu sắc).
    2. Độ hữu ích: AI có trả lời đúng trọng tâm câu hỏi của khách không?
    3. Thái độ: AI có giữ được sự chuyên nghiệp không?
    
    LƯU Ý: Nếu khách chê sản phẩm xấu/đắt nhưng AI đã tư vấn đúng giá/đúng mẫu, hãy đánh giá AI TỐT (vì sản phẩm là khách quan).
    Chỉ đánh giá AI KÉM khi AI đưa thông tin sai lệch so với dữ liệu gốc.

    Tiêu chí chấm điểm (Score từ 1-10):
    - 10: AI trả lời chính xác, thân thiện, giải quyết được vấn đề.
    - 7-8: AI trả lời đúng nhưng hơi chậm hoặc máy móc.
    - 5-6: AI không hiểu ý khách hoặc trả lời chung chung.
    - Dưới 5: AI trả lời sai kiến thức sản phẩm, sai giá hoặc khiến khách giận dữ.
    
    Dữ liệu đầu vào:
    - Lịch sử chat: {message}
    - Nhận xét từ người dùng: {user_comment}
    """


    prompt = ChatPromptTemplate.from_template(system_prompt)
    chain = prompt | structured_llm

    return await chain.ainvoke({
        "message": "\n".join(history_chat),
        "user_comment": user_comment
    })
class FeedbackService :
    @staticmethod
    async def create_feedback (feedback : CreateFeedback , session : Session) :
        analyst = await evaluate_AI_feedback(feedback.history , feedback.comment)  
        new_feedback = Feedback(
            thread_id = feedback.thread_id,
            rating = feedback.rating ,
            ai_score = analyst.score ,
            agent_sentiment = analyst.sentiment ,
            root_cause = analyst.root_cause
        )
        try :
            session.add(new_feedback)
            session.commit()
            session.refresh(new_feedback)
            print("số điểm của AI chấm : " + str(analyst.score))
            is_conflict = feedback.rating <= 2 and analyst.score >= 8
            if analyst.score <= 6 or feedback.rating <= 2:
                
                if is_conflict:
                    task_title = "Hallucination"
                    task_desc = f"Khách đánh giá {feedback.rating} sao nhưng AI tự chấm {analyst.score}đ. Lý do AI đưa ra: {analyst.root_cause}. Cần review lại lịch sử chat xem AI hay Khách sai."
                elif analyst.score <= 6:
                    task_title = "Sửa lỗi AI"
                    task_desc = analyst.root_cause
                else:
                    task_title = "Review trải nghiệm khách hàng kém"
                    task_desc = "Khách hàng đánh giá thấp, cần kiểm tra lại thái độ AI hoặc chính sách CSKH."

                newTask = Task(
                    title=task_title,
                    description=task_desc,
                    related_feedback_id=new_feedback.id,
                    related_thread_id=feedback.thread_id
                )
                session.add(newTask)
                session.commit()
            
            return new_feedback
            
        except Exception as e :
            session.rollback()
            print(f"❌ Database Error: {e}")
            raise Exception("Lỗi khi lưu dữ liệu vào hệ thống.")