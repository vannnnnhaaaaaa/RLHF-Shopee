from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session 

from src.backend.models import Task , FinalResult , User
from src.backend.auth import get_current_user , get_session
from src.backend.schemas import CreateFinalResult
from src.backend.services.finalresult_service import resolve_task_conflict_data , get_dashboard_stats , get_member_dashboard_stats , get_all_users_performance,get_global_system_stats

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


@finalresult_router.get("/admin/dashboard/member/{member_id}")
async def member_dashboard_stats(
    member_id: int, 
    session: Session = Depends(get_session) ,
    current_user : User = Depends (get_current_user)
):
    if current_user.auth != 'admin' :
        raise HTTPException (status_code=403, detail='Bạn không có quyển truy cập')
    # 1. Lấy thông tin User và Trust Score
    user = session.get(User, member_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy Member này")
    
    result =  await get_member_dashboard_stats(member_id ,session)
    return result


@finalresult_router.get("/admin/user-performance")
async def all_users_performance(session: Session = Depends(get_session) , current_user : User = Depends (get_current_user)):
    if current_user.auth != 'admin' :
        raise HTTPException (status_code=403, detail='Bạn không có quyển truy cập')
    result =  await get_all_users_performance(session)
    return result



@finalresult_router.get("/admin/system-stats")
async def global_system_stats(session: Session = Depends(get_session) ,  current_user : User = Depends (get_current_user)):
    if current_user.auth != 'admin' :
        raise HTTPException (status_code=403, detail='Bạn không có quyển truy cập')
    result =  await get_global_system_stats(session)
    return result