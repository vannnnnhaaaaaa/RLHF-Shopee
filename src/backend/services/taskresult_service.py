from fastapi import  HTTPException
from sqlmodel  import select ,Session

from src.backend.schemas  import TaskResultUpdate , TaskResultResponse

from src.backend.models import User , Task , TaskResult
from src.backend.services.task_service import review_detail_message


async def updateTaskResult( taskId: int,  data: TaskResultUpdate, current_user: User  ,session: Session):
    # 1. Tìm phiếu giao việc (TaskResult) khớp với taskId và ID của Member đang đăng nhập
    statement = select(TaskResult).where(
        TaskResult.task_id == taskId,
        TaskResult.member_id == current_user.id
    )
    db_task_result = session.exec(statement).first()

    # 2. Xử lý lỗi nếu không tìm thấy (Do chưa được giao hoặc URL sai)
    if not db_task_result:
        raise HTTPException(
            status_code=404, 
            detail="Không tìm thấy task này hoặc bạn chưa được phân công xử lý."
        )

    # 3. Kiểm tra xem Member đã nộp bài trước đó chưa (Tránh nộp đè 2 lần)
    if db_task_result.status == "accomplished":
        raise HTTPException(
            status_code=400, 
            detail="Bạn đã hoàn thành và nộp bài đánh giá cho Task này rồi."
        )

    # 4. Cập nhật các trường dữ liệu từ Payload vào Database
    # Dùng exclude_unset=True để chỉ cập nhật những trường thực sự được gửi lên
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task_result, key, value)

    # 5. Đổi trạng thái thành "Đã hoàn thành"
    db_task_result.status = "accomplished"

    # 6. Lưu thay đổi vào DB
    session.add(db_task_result)
    session.commit()
    session.refresh(db_task_result)

    # Trả về dữ liệu đã cập nhật (tự động map với TaskResultResponse)
    return db_task_result



async def get_conflict_tasks(session: Session ):
    statement = select(Task).where(Task.status == 'distributed')
    tasks = session.exec(statement).all()
    
    conflict_tasks = []
    
    for task in tasks:
        results = task.result_tasks
        
        if len(results) >= 2:
            useful_scores = [r.useful for r in results]
            
            # Nếu có sự khác biệt về điểm đánh giá
            if len(set(useful_scores)) > 1:

                messages_data = []
                fb = task.feedback_info  # Lấy object Feedback liên kết với Task này
                
                # Kiểm tra xem có feedback và feedback đó có lưu thread_id không
                if fb and fb.thread_id: 
                    raw_messages = await review_detail_message(task.id, session)
                    
                    messages_data = [
                        {
                            "role": m.role, 
                            "content": m.content, 
                            "created_at": m.created_at.isoformat() if m.created_at else None
                        } for m in raw_messages
                    ]
                
                # Đóng gói dữ liệu trả về
                conflict_tasks.append({
                    "id": task.id,
                    "title": task.title,
                    "messages": messages_data,  # Lịch sử chat đã được lấy qua Feedback
                    "results": [
                        {
                            "member_name": r.member_user.user_name if r.member_user else f"User {r.member_id}", 
                            "useful": r.useful,
                            "grounded": r.grounded,
                            "following": r.following,
                            "harmful": r.harmful,
                            "active_time": r.active_time,
                            "solution": r.solution
                        } for r in results
                    ]
                })
    
    return conflict_tasks