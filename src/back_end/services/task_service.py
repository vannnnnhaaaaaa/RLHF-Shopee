from fastapi import Depends ,APIRouter , HTTPException
from datetime import datetime , timedelta
from sqlmodel import Session ,select  , or_ , func
from src.back_end.models import Task , User , ChatMessage , Feedback , TaskResult
from src.back_end.schemas import   TaskCreate , TaskRead   , TaskApprove
from src.back_end.auth import get_current_user
from src.back_end.connect_database import get_session
from sqlalchemy.orm import joinedload

async def getAllTask (session: Session):
   statement = select(Task).options(joinedload(Task.feedback_info))
   results = session.exec(statement).all()
   formatted_tasks = []
   for task in results:
      task_data = task.model_dump() 
      task_data["feedback_at"] = task.feedback_info.created_at if task.feedback_info else None
      formatted_tasks.append(task_data)
   formatted_tasks.sort(key=lambda x: x["feedback_at"] or datetime.max, reverse=False)
   return formatted_tasks

async def approveTask(taskId: int, deadline_days: int, admin_id: int, session: Session):
    
   db_task = session.get(Task, taskId) 
   if not db_task:
      raise HTTPException(status_code=404, detail='Task không tồn tại')
   today = datetime.now()
   # SỬA Ở ĐÂY: Lấy mốc thời gian là 00:00:00 của ngày hôm nay
   start_of_day = today.replace(hour=0, minute=0, second=0, microsecond=0)
   
   # 2. Lấy danh sách tất cả Member
   members = session.exec(select(User).where(User.auth == 'member')).all()
   if not members:
       raise HTTPException(status_code=400, detail="Hệ thống chưa có nhân viên nào để giao việc")
   print('đã lấy member xong')  
   # 3. Tính toán số lượng task mỗi member đã nhận TRONG NGÀY HÔM NAY
   member_stats = []
   for m in members:
      count = session.exec(
         select(func.count(TaskResult.id))
         .where(TaskResult.member_id == m.id)
         .where(TaskResult.created_at >= start_of_day) # Thay đổi biến ở đây
      ).one()
      member_stats.append({"member": m, "count": count})
       
   # 4. Sắp xếp Member theo số lượng task tăng dần
   member_stats.sort(key=lambda x: x["count"])
   
   # 5. Chọn ra 3 người ít việc nhất trong ngày hôm nay
   top_3_candidates = member_stats[:3] 
   
   # 6. Cập nhật Task gốc
   new_deadline = datetime.now() + timedelta(days=deadline_days)
   db_task.admin_id = admin_id
   db_task.deadline = new_deadline
   db_task.status = 'distributed' # Đổi status để báo hiệu đã phân phối
   db_task.started_at = datetime.now() 
   session.add(db_task)
   

   # 7. Tạo 3 bản ghi TaskResult (Phiếu giao việc) cho 3 người được chọn
   for stat in top_3_candidates:
      new_result = TaskResult(
         task_id=db_task.id,
         member_id=stat["member"].id,
         status="activate", # Trạng thái sẵn sàng để member làm
         created_at=datetime.now()
      )
      session.add(new_result)
       
   session.commit()
   session.refresh(db_task)
   return db_task

async def review_detail_message (taskId : int ,  session : Session  ) :
   db_task = session.get(Task , taskId)
   print(db_task)
   if not db_task :
      raise HTTPException (status_code=404 , detail='Task không tồn tại')
   thread_id = db_task.feedback_info.thread_id 
   try :
      statement = select(ChatMessage).where(ChatMessage.thread_id == thread_id).order_by(ChatMessage.created_at.asc())
      message =  session.exec(statement=statement).all()
   except Exception as e :
      raise HTTPException(status_code= 404 , detail= f"{e}")  
   return message


      
