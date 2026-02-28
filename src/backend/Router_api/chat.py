from fastapi import APIRouter, HTTPException  , Depends
from sqlmodel import  Session

from src.back_end.connect_database import   get_session
from src.back_end.schemas import ChatRequest , ChatResponse
from src.back_end.services.chat_service import Chatservice
router_chat = APIRouter(
    prefix="/chat",
)

@router_chat.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest , session : Session = Depends(get_session)):
    try :
        msg_ai = await Chatservice.create_response_ai(request , session)
        return ChatResponse(
            id = msg_ai.id  ,
            answer=msg_ai.content
        )
    except Exception as e :
        raise HTTPException(status_code=500 , detail=f'{e}')