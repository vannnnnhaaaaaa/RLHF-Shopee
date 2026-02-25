from datetime import datetime , time
from fastapi import HTTPException
from sqlmodel import Session , select , func , outerjoin

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
    statement = select(TaskResult).where(TaskResult.task_id == taskId)
   
    evaluations = session.exec(statement).all()
    
    # Cấu hình mức phạt: Trừ 5 điểm cho mỗi tiêu chí lệch với Admin
    PENALTY_PER_WRONG_CRITERIA = 5 
    
    for eval in evaluations:
        wrong_count = 0
        
        # So sánh chéo 4 tiêu chí
        if eval.useful != data.useful: wrong_count += 1
        if eval.grounded != data.grounded: wrong_count += 1
        if eval.following != data.following: wrong_count += 1
        if eval.harmful != data.harmful: wrong_count += 1
        
        # Nếu Member chấm sai ít nhất 1 tiêu chí
        if wrong_count > 0:
            # Lấy object User từ DB (thay eval.user_id bằng khoá ngoại tương ứng của bạn)
            member = session.get(User, eval.member_id) 
            
            # Chỉ trừ điểm nếu user tồn tại và không phải là Admin
            if member and member.auth != "admin": 
                total_penalty = wrong_count * PENALTY_PER_WRONG_CRITERIA
                
                # Cập nhật trường trust_score, dùng max(0, ...) để điểm không rớt xuống số âm
                member.trust_score = max(0, member.trust_score - total_penalty)
                
                # Đưa vào session để chờ commit
                session.add(member)
    session.commit()
    
    return {"message": "Đã chốt kết quả Final và cập nhật trust_score thành công!"}
 


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


async def get_member_dashboard_stats(
    member_id: int, 
    session: Session
):
    # 1. Lấy thông tin User và Trust Score
    user = session.get(User, member_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy Member này")
    
    # 2. Đếm tổng số Task Member đã làm
    # Lưu ý: Thay TaskResult.user_id bằng tên cột khóa ngoại thực tế của bạn
    stmt_task_count = select(func.count(TaskResult.id)).where(TaskResult.member_id == member_id)
    total_tasks = session.exec(stmt_task_count).one() # .one() trả về đúng 1 giá trị (số lượng)

    # 3. Tính tổng Active Time và Idle Time
    # Giả định bạn có bảng TaskTimeLog lưu thời gian theo từng giây (seconds)
    stmt_stats = select(
        func.count(TaskResult.id),
        func.sum(TaskResult.active_time),
        func.sum(TaskResult.idle_time)
    ).where(TaskResult.member_id == member_id)
    
    time_result = session.exec(stmt_stats).first()
    
    # Xử lý trường hợp Member chưa làm task nào (sum trả về None)
    total_active_sec = time_result[0] if time_result[0] else 0
    total_idle_sec = time_result[1] if time_result[1] else 0

    # 4. Trả về format JSON chuẩn cho Frontend vẽ biểu đồ
    return {
        "member_info": {
            "id": user.id,
            "name": user.user_name, # Hoặc user.username
            "role": user.auth
        },
        "performance_metrics": {
            "trust_score": user.trust_score,
            "total_tasks_completed": total_tasks
        },
        "time_analytics": {
            "active_time_seconds": total_active_sec,
            "idle_time_seconds": total_idle_sec,
            "total_time_logged": total_active_sec + total_idle_sec
        }
    }



async def get_all_users_performance(session: Session):
    """
    API lấy danh sách thống kê hiệu suất của toàn bộ Member.
    Phục vụ cho màn hình Dashboard tổng.
    """
    
    # 1. Xây dựng câu lệnh Query (LEFT OUTER JOIN)
    # Lấy User làm gốc, join với TaskResult để đếm task và tính thời gian
    statement = (
        select(
            User.id,
            User.user_name, # Đổi thành User.username nếu Model của bạn dùng username
            User.trust_score,
            func.count(TaskResult.id).label("completed_tasks"),
            func.sum(TaskResult.active_time).label("total_active"),
            func.sum(TaskResult.idle_time).label("total_idle")
        )
        .outerjoin(TaskResult, User.id == TaskResult.member_id)
        .where(User.auth != "admin") # Chỉ lấy dữ liệu của Member, bỏ qua Admin
        .group_by(User.id, User.user_name, User.trust_score)
    )
    
    # 2. Thực thi Query
    results = session.exec(statement).all()
    
    # 3. Format lại dữ liệu trả về cho Frontend
    response_data = []
    
    for row in results:
        # row trả về một tuple theo đúng thứ tự trong hàm select()
        user_id, user_name, trust_score, completed_tasks, total_active, total_idle = row
        
        # Xử lý trường hợp Member chưa làm task nào (hàm sum sẽ trả về None)
        active = total_active if total_active else 0
        idle = total_idle if total_idle else 0
        total_time = active + idle
        
        # Tính Tỷ lệ tập trung (Focus Rate = Active / Total * 100)
        focus_rate = 0
        if total_time > 0:
            focus_rate = round((active / total_time) * 100, 1) # Làm tròn 1 chữ số thập phân
            
        response_data.append({
            "user_id": user_id,
            "user_name": user_name or f"Thành viên #{user_id}", # Fallback nếu name bị rỗng
            "completed_tasks": completed_tasks,
            "trust_score": trust_score or 100, # Fallback điểm mặc định
            "focus_rate": focus_rate
        })
        
    return response_data


async def get_global_system_stats(session: Session):
    now = datetime.now()
    
    # 1. Xác định mốc thời gian cho "Hôm nay"
    start_of_today = datetime.combine(now.date(), time.min) # 00:00:00 hôm nay
    end_of_today = datetime.combine(now.date(), time.max)   # 23:59:59 hôm nay
    
    # 2. Xác định mốc thời gian cho "Tháng này"
    start_of_month = datetime(now.year, now.month, 1)       # Ngày 1 của tháng hiện tại
    
    # Hàm helper để query nhanh nhằm tránh lặp code
    def get_stats_for_period(start_date, end_date=None):
        stmt = select(
            func.count(TaskResult.id),
            func.sum(TaskResult.active_time),
            func.sum(TaskResult.idle_time)
        ).where(TaskResult.created_at >= start_date)
        
        if end_date:
            stmt = stmt.where(TaskResult.created_at <= end_date)
            
        result = session.exec(stmt).first()
        
        # result trả về tuple: (count, sum_active, sum_idle)
        return {
            "tasks": result[0] if result[0] else 0,
            "active_time": result[1] if result[1] else 0, # Đơn vị: giây
            "idle_time": result[2] if result[2] else 0    # Đơn vị: giây
        }

    # 3. Chạy query cho 2 mốc thời gian
    today_stats = get_stats_for_period(start_of_today, end_of_today)
    month_stats = get_stats_for_period(start_of_month)

    # 4. Trả về JSON cho Frontend
    return {
        "today": today_stats,
        "month": month_stats
    }