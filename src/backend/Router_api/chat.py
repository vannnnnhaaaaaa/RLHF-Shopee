from fastapi import APIRouter, HTTPException  , Depends
from sqlmodel import  Session

from src.backend.connect_database import   get_session
from src.backend.schemas import ChatRequest , ChatResponse
from src.backend.chatbot_assitant.graph.graph import  ShopeeBotWorkflow 
from src.backend.chatbot_assitant.graph.legal_agent import agent_manager
router_chat = APIRouter(
    prefix="/chat",
)



@router_chat.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest , session : Session = Depends(get_session)):
    try :
        chatbot = ShopeeBotWorkflow(agent_manager=agent_manager , session= session)
        app = chatbot.build_chatbot_graph()
        result = app.invoke ({
            "messages": [("user", request.question)]
        })
        ai_response = result["messages"][-1].content
        return {
            "status": "success",
            "answer": ai_response
        }
    except Exception as e :
        print(f"Lỗi Chatbot: {e}")
        return {
            "status": "error", 
            "answer": "Bot đang bận, vui lòng thử lại sau!" 
        }