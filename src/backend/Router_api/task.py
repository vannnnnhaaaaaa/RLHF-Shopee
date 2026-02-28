from fastapi import Depends ,APIRouter , HTTPException

from sqlmodel import Session ,select  , or_
from src.backend.models import Task , User  , TaskResult
from src.backend.schemas import   TaskCreate , TaskReadDetail    , TaskApprove , TaskRead
from src.backend.auth import get_current_user
from src.backend.connect_database import get_session
from src.backend.services.task_service import approveTask , review_detail_message , getAllTask
task_router = APIRouter()

@task_router.get("/tasks" , response_model=list[TaskRead])
async def read_task (session : Session = Depends(get_session) , current_user : User = Depends(get_current_user) ) :
    if current_user.auth != 'admin' :
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền duyệt task")
    all_task =await getAllTask(session)
    return all_task
    

@task_router.patch("/task/{taskId}/approve"  ) 
async def approve_task (taskId : int ,data : TaskApprove , current_user : User = Depends(get_current_user) , session  : Session = Depends(get_session)) :
    if current_user.auth != 'admin' :
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền duyệt task")
    admin_id = current_user.id
    result = await approveTask(taskId ,data.deadline, admin_id, session)
    return result

@task_router.get('/{taskId}/detailtask', response_model=TaskReadDetail)
async def get_detail_task(
    taskId: int, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    # 1. Kiểm tra Task có tồn tại không
    db_task = session.get(Task, taskId)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task không tồn tại")

    # 2. Logic phân quyền (Authorization) mới dựa trên TaskResult
    if current_user.auth != 'admin':
        # Tìm xem Member này có được phân công làm Task này không
        statement = select(TaskResult).where(
            TaskResult.task_id == taskId,
            TaskResult.member_id == current_user.id
        )
        assignment = session.exec(statement).first()
        
        if not assignment:
            raise HTTPException(
                status_code=403, 
                detail="Bạn không có quyền xem task này vì task chưa được giao cho bạn."
            )

    # 3. Lấy dữ liệu chi tiết
    messages = await review_detail_message(taskId, session)
    fb = db_task.feedback_info
    
    return {
        "id": db_task.id,
        "title": db_task.title,
        "description": db_task.description,
        "status": db_task.status,
        "feedback_at" : fb.created_at if fb else None,
        "started_at": db_task.started_at,
        "completed_at": db_task.completed_at,
        "deadline": db_task.deadline,
        "messages": messages,          
        "agent_sentiment": fb.agent_sentiment if fb else "", 
        "root_cause": fb.root_cause if fb else "",           
        "comment": fb.comment if fb else "",            
        "rating": fb.rating if fb else 0                 
    }
@task_router.get("/available", response_model=list[TaskRead])
def read_available_task(
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    
    statement = select(TaskResult).where(TaskResult.member_id == current_user.id , TaskResult.status == 'activate')
    tasks_results = session.exec(statement).all()
    alltask = []
    for task_result in tasks_results :
        alltask.append(task_result.task)
   
    return alltask


@task_router.post("/tasks" , response_model=TaskRead ) 
def post_task (task : TaskCreate , current_user : User = Depends(get_current_user) ,session :Session = Depends(get_session)):
    if current_user.auth == 'admin' :
        task_dict = task.model_dump()
        db_task = Task(
            **task_dict,
            admin_id=current_user.id,
            status = "available"
        )
        session.add(db_task)
        session.commit()
        session.refresh(db_task)
        return db_task
    
    raise HTTPException(
            status_code=403, 
            detail="Bạn không có quyền tạo Task. Chỉ Admin mới được phép!"
        )
    

    
@task_router.delete("/tasks/{task_id}")
def delete_task (task_id : int ,current_user : User = Depends(get_current_user),session : Session = Depends(get_session)):
    if current_user.auth == 'admin' :
        db_task = session.get(Task,task_id)
        if db_task :
            session.delete(db_task)
            session.commit()
            return {"ok": True ,'status' : "thanh cong" , "detail" : "da xoa thanh cong task can xoa"}
        raise HTTPException(status_code=400 , detail="khong tim thay task can xoa")
    raise HTTPException (status_code=403,detail="Bạn không có quyền xóa Task. Chỉ Admin mới được phép!")