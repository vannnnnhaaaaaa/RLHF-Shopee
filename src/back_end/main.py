from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.back_end.Router_api.product import router_product
from src.back_end.Router_api.chat import router_chat
from src.back_end.Router_api.feedback import router_feedback
from src.back_end.Router_api.task import task_router
from src.back_end.Router_api.user import user_router
from src.back_end.Router_api.taskresult import taskResult_router
from src.back_end.Router_api.finalresult import finalresult_router

app = FastAPI(
    title="Shopee AI Backend",
    description="API Server với kiến trúc Router",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router_chat , tags=['Chat'])
app.include_router(router_product , tags=['Products'])
app.include_router(router_feedback ,tags=['Feedback'] )
app.include_router(task_router ,tags=['Task'] )
app.include_router(user_router ,tags=['User'] )
app.include_router(taskResult_router ,tags=['TaskResult'] )
app.include_router(finalresult_router ,tags=['FinalResult'] )



