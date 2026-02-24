
from fastapi import HTTPException
from sqlmodel import Session , select

from src.back_end.models import Task , FinalResult , User , TaskResult
from src.back_end.schemas import CreateFinalResult

async def resolve_task_conflict_data(
    taskId: int, 
    data: CreateFinalResult, 
    session: Session  ,
    current_user : User
):
    db_task = session.get(Task, taskId)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task không tồn tại")

    # 1. Tạo bản ghi kết quả cuối cùng
    final_res = FinalResult(
        task_id=taskId,
        admin_id=current_user.id,
        final_solution=data.solution,
        final_useful=data.useful,
        final_grounded = data.grounded  ,
        final_following = data.following,
        final_harmful= data.harmful
    )
    session.add(final_res)

    # 2. Đóng Task
    db_task.status = "finalized"
    session.add(db_task)
    
    session.commit()
    return {"message": "Đã chốt kết quả thành công cho bộ dữ liệu train AI!"}


async def get_dashboard_stats(session: Session):
    # 1. Thống kê tổng quan Task
    total_tasks = session.exec(select(Task)).all()
    status_counts = {"pending": 0, "active": 0, "finalized": 0}
    for t in total_tasks:
        if t.status in status_counts:
            status_counts[t.status] += 1
        elif t.status == "accepted": # hoặc các status khác bạn đang dùng
            status_counts["active"] += 1 

    # 2. Tính điểm tự động cho User (Agreement Rate)
    users = session.exec(select(User).where(User.auth != 'admin')).all()
    user_stats = []

    for user in users:
        # Lấy các bài làm của user này
        user_results = session.exec(select(TaskResult).where(TaskResult.member_id == user.id)).all()
        
        total_score = 0
        evaluated_tasks = 0
        total_active_time = 0

        for r in user_results:
            total_active_time += r.active_time
            # Lấy kết quả Final của Task này (nếu Admin đã chốt)
            final_res = session.exec(select(FinalResult).where(FinalResult.task_id == r.task_id)).first()
            
            if final_res:
                evaluated_tasks += 1
                match_count = 0
                if r.following == final_res.final_following: match_count += 1
                if r.grounded == final_res.final_grounded: match_count += 1
                if r.useful == final_res.final_useful: match_count += 1
                if r.harmful == final_res.final_harmful: match_count += 1
                
                # Tính % cho task này
                task_accuracy = (match_count / 4.0) * 100
                total_score += task_accuracy

        # Tính trung bình điểm của User
        avg_accuracy = round(total_score / evaluated_tasks, 1) if evaluated_tasks > 0 else 0
        
        user_stats.append({
            "username": user.user_name,
            "tasks_done": len(user_results),
            "evaluated_tasks": evaluated_tasks,
            "accuracy": avg_accuracy,
            "total_active_time": total_active_time
        })

    # Sắp xếp User theo độ chính xác giảm dần (Bảng xếp hạng)
    user_stats.sort(key=lambda x: x["accuracy"], reverse=True)

    return {
        "overview": {
            "total": len(total_tasks),
            "pending": status_counts["pending"],
            "active": status_counts["active"],
            "finalized": status_counts["finalized"]
        },
        "leaderboard": user_stats
    }