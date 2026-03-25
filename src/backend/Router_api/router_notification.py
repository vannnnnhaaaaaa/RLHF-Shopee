from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, update
from typing import List

from src.backend.connect_database import get_session
from src.backend.models import Notification
from src.backend.auth import get_current_customer
from src.backend.schemas import ResponseNotification

router_notification = APIRouter(prefix="/notifications", tags=["Notifications"])

# =====================================================================
# NOTIFICATION APIs FOR CUSTOMERS
# =====================================================================

@router_notification.get("/my-notifications", response_model=List[ResponseNotification])
def get_my_notifications(
    session: Session = Depends(get_session),
    current_customer = Depends(get_current_customer),
    skip: int = 0,
    limit: int = 20
):
    """
    Lấy danh sách thông báo của customer hiện tại
    Sắp xếp theo thời gian tạo giảm dần (mới nhất lên đầu)
    """
    try:
        customer_id = current_customer.id

        statement = (
            select(Notification)
            .where(Notification.user_id == customer_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        notifications = session.exec(statement).all()

        return notifications

    except Exception as e:
        print(f"Lỗi khi lấy thông báo: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi tải thông báo.")

@router_notification.put("/mark-all-read")
def mark_all_notifications_as_read(
    session: Session = Depends(get_session),
    current_customer = Depends(get_current_customer)
):
    """
    Đánh dấu tất cả thông báo của customer là đã đọc
    """
    try:
        customer_id = current_customer.id

        # Cập nhật tất cả thông báo chưa đọc thành đã đọc
        statement = (
            update(Notification)
            .where(Notification.user_id == customer_id)
            .where(Notification.is_read == False)
            .values(is_read=True)
        )

        session.exec(statement)
        session.commit()

        return {
            "status": "success",
            "message": "Đã đánh dấu tất cả thông báo là đã đọc."
        }

    except Exception as e:
        print(f"Lỗi khi cập nhật thông báo: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi cập nhật thông báo.")

@router_notification.put("/{notification_id}/mark-read")
def mark_notification_as_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_customer = Depends(get_current_customer)
):
    """
    Đánh dấu một thông báo cụ thể là đã đọc
    """
    try:
        customer_id = current_customer.id

        # Tìm thông báo
        notification = session.get(Notification, notification_id)
        if not notification:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")

        # Kiểm tra quyền sở hữu
        if notification.user_id != customer_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập thông báo này.")

        # Cập nhật trạng thái
        notification.is_read = True
        session.add(notification)
        session.commit()

        return {
            "status": "success",
            "message": "Đã đánh dấu thông báo là đã đọc."
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi cập nhật thông báo: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi cập nhật thông báo.")