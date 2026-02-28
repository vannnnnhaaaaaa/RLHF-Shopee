from fastapi import APIRouter, HTTPException  , Depends
from sqlmodel import  Session

from src.backend.connect_database import   get_session
from src.backend.schemas import ChatRequest , ChatResponse
from src.backend.services.chat_service import Chatservice
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