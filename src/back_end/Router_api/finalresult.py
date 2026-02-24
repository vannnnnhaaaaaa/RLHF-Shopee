from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session 

from src.back_end.models import Task , FinalResult , User
from src.back_end.auth import get_current_user , get_session
from src.back_end.schemas import CreateFinalResult
from src.back_end.services.finalresult_service import resolve_task_conflict_data , get_dashboard_stats

finalresult_router = APIRouter()

@finalresult_router.post("/admin/resolve-conflict/{taskId}")
async def resolve_task_conflict(
    taskId: int, 
    data: CreateFinalResult, 
    session: Session = Depends(get_session),
    current_user : User = Depends (get_current_user)
):
    if current_user.auth != 'admin' :
        raise HTTPException(status_code=403 , detail="Bạn không có quyền truy cập ")
    result = await resolve_task_conflict_data(taskId ,data,session ,current_user)
    return result


@finalresult_router.get('/admin/dashboard-stats')
async def dashboard(session : Session = Depends(get_session),current_user : User = Depends (get_current_user)):
    if current_user.auth != 'admin' :
        raise HTTPException (status_code=403, detail='Bạn không có quyển truy cập')
    result = await get_dashboard_stats (session)
    return result