from fastapi import Depends ,APIRouter , HTTPException

from sqlmodel import Session ,select  , or_
from datetime import datetime, timedelta
from src.backend.models import Task , User  , TaskResult
from src.backend.schemas import TaskCreate , TaskReadDetail, TaskApprove , TaskRead, DistributedTaskResponse, WorkerTaskStatus
from src.backend.auth import get_current_admin, get_current_member
from src.backend.connect_database import get_session
from src.backend.services.task_service import approveTask , review_detail_message , getAllTask
task_router = APIRouter()

@task_router.get("/tasks" , response_model=list[TaskRead])
async def read_task (session : Session = Depends(get_session) , current_user : User = Depends(get_current_admin) ) :
   
    all_task =await getAllTask(session)
    return all_task
    

@task_router.patch("/task/{taskId}/approve"  ) 
async def approve_task (taskId : int ,data : TaskApprove , current_user : User = Depends(get_current_admin) , session  : Session = Depends(get_session)) :
   
    admin_id = current_user.id
    result = await approveTask(taskId ,data.deadline, admin_id, session)
    return result

@task_router.get('/admin/{taskId}/detailtask', response_model=TaskReadDetail)
async def admin_get_detail_task(
    taskId: int, 
    current_admin: User = Depends(get_current_admin), # Bức tường bảo vệ: Chỉ Admin mới qua được
    session: Session = Depends(get_session)
):
    # 1. Kiểm tra Task có tồn tại trong hệ thống không
    db_task = session.get(Task, taskId)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task không tồn tại")

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
        "root_cause_by_ai": fb.root_cause_by_ai if fb and fb.root_cause_by_ai else "",  
        "root_cause_by_human" : fb.root_cause_by_human if fb else "" ,       
        "comment": fb.comment if fb else "",            
        "rating": fb.rating if fb else 0                
    }

@task_router.get('/{taskId}/detailtask', response_model=TaskReadDetail)
async def get_detail_task(
    taskId: int, 
    current_user: User = Depends(get_current_member), 
    session: Session = Depends(get_session)
):
    # 1. Kiểm tra Task có tồn tại không
    db_task = session.get(Task, taskId)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task không tồn tại")

    # 2. Logic phân quyền (Authorization) thông minh
    # Nếu không phải là Admin (tức là Member), thì mới bắt buộc kiểm tra bảng TaskResult
    if current_user.auth != 'admin':
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
        "root_cause_by_ai": fb.root_cause_by_ai if fb and fb.root_cause_by_ai else "",
        "root_cause_by_human": fb.root_cause_by_human if fb else None,
        "comment": fb.comment if fb else "",            
        "rating": fb.rating if fb else 0                
    }
@task_router.get("/available", response_model=list[TaskRead])
def read_available_task(
    current_user: User = Depends(get_current_member),  # ✅ FIXED: Accepts both member and admin
    session: Session = Depends(get_session)
):
    # ✅ Query differently based on user role
    payload_token = None  # Will be populated from header IF needed
    
    # For admin: show all available tasks
    # For member: show only their assigned tasks with 'activate' status
    statement = select(TaskResult).where(
        TaskResult.member_id == current_user.id,
        TaskResult.status == 'activate'
    )
    tasks_results = session.exec(statement).all()
    alltask = []
    for task_result in tasks_results:
        alltask.append(task_result.task)
    
    print(f"[TASK_API] /available - user_id={current_user.id}, tasks_count={len(alltask)}")
    return alltask
   



@task_router.post("/tasks" , response_model=TaskRead ) 
def post_task (task : TaskCreate , current_user : User = Depends(get_current_admin) ,session :Session = Depends(get_session)):
    
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
    
  
    

    
@task_router.delete("/tasks/{task_id}")
def delete_task (task_id : int ,current_user : User = Depends(get_current_admin),session : Session = Depends(get_session)):
   
    db_task = session.get(Task,task_id)
    if db_task :
        session.delete(db_task)
        session.commit()
        return {"ok": True ,'status' : "thanh cong" , "detail" : "da xoa thanh cong task can xoa"}
    raise HTTPException(status_code=400 , detail="khong tim thay task can xoa")


@task_router.get("/admin/distributed-tasks", response_model=list[DistributedTaskResponse])
async def get_distributed_tasks(
    current_admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    """
    Lấy danh sách các task đã được phân công (distributed) trong 3 ngày gần nhất.
    Kèm theo danh sách 3 worker đang làm task đó.
    """
    # Lọc task từ 3 ngày gần nhất
    three_days_ago = datetime.now() - timedelta(days=3)
    
    statement = select(Task).where(
        Task.status == "distributed",
        Task.started_at >= three_days_ago
    ).order_by(Task.started_at.desc())
    
    tasks = session.exec(statement).all()
    result = []
    
    for task in tasks:
        # Lấy danh sách TaskResult (workers) cho task này
        worker_statement = select(TaskResult).where(
            TaskResult.task_id == task.id
        ).order_by(TaskResult.created_at)
        
        task_results = session.exec(worker_statement).all()
        
        workers = []
        for tr in task_results:
            # Tính thời gian hoàn thành
            time_taken_seconds = None
            if tr.status == "completed" and task.completed_at and task.started_at:
                time_diff = task.completed_at - task.started_at
                time_taken_seconds = int(time_diff.total_seconds())
            
            worker = WorkerTaskStatus(
                user_id=tr.member_user.id,
                username=tr.member_user.user_name,
                status=tr.status,
                time_taken_seconds=time_taken_seconds,
                total_time=tr.total_time,
                active_time=tr.active_time
            )
            workers.append(worker)
        
        dist_task = DistributedTaskResponse(
            id=task.id,
            title=task.title,
            description=task.description,
            status=task.status,
            deadline=task.deadline,
            created_at=task.started_at,
            workers=workers
        )
        result.append(dist_task)
    
    return result