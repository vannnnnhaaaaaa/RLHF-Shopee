from sqlmodel import Session
from fastapi import Depends , HTTPException , APIRouter

from src.back_end.connect_database import get_session
from src.back_end.schemas import CreateFeedback  ,FeedbackResponse
from src.back_end.models import Feedback
from src.back_end.services.feedback_service import FeedbackService 

router_feedback = APIRouter(prefix="/feedback")

@router_feedback.post("/", response_model=FeedbackResponse)
async def feedback_endpoint(feedback: CreateFeedback, session: Session = Depends(get_session)):
    try :
        result = await FeedbackService.create_feedback(feedback=feedback, session=session)
        return result
    except Exception as e:
        print(f" API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))