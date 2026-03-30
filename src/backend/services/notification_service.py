from sqlmodel import Session
from src.backend.models import Notification, Order

def create_notification(session: Session, user_id: int, title: str, body: str, order_id: int = None, image_url: str = None):
    """
    Tạo thông báo chung cho người dùng
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        image_url=image_url,
        order_id=order_id,
        is_read=False
    )
    session.add(notification)

def create_order_status_notification(session: Session, order: Order, new_status: str):
    """
    Tạo thông báo khi trạng thái đơn hàng thay đổi
    """
    # Xác định title và body dựa trên new_status
    if new_status.upper() == 'PENDING':
        title = "Đơn hàng đã được tạo 📦"
        body = f"Đơn hàng #{order.id} đã được tạo thành công. Vui lòng chờ xác nhận từ người bán."
    elif new_status.upper() == 'ACCEPT':
        title = "Đơn hàng đã được xác nhận ✅"
        body = f"Đơn hàng #{order.id} đã được người bán xác nhận và đang chuẩn bị hàng."
    elif new_status.upper() == 'DELIVERING':
        title = "Đơn hàng đang giao 🚚"
        body = f"Đơn hàng #{order.id} đã được giao cho đơn vị vận chuyển."
    elif new_status.upper() == 'COMPLETED':
        title = "Đơn hàng đã hoàn thành 🎉"
        body = f"Đơn hàng #{order.id} đã được giao thành công. Cảm ơn bạn đã mua hàng!"
    elif new_status.upper() == 'CANCELLED':
        title = "Đơn hàng đã bị hủy ❌"
        body = f"Đơn hàng #{order.id} đã bị hủy. Vui lòng liên hệ người bán để biết thêm chi tiết."
    else:
        title = f"Trạng thái đơn hàng thay đổi"
        body = f"Đơn hàng #{order.id} có trạng thái mới: {new_status}"

    # Lấy image_url từ sản phẩm đầu tiên trong đơn hàng (nếu có)
    image_url = None
    if order.items and len(order.items) > 0 and order.items[0].product:
        image_url = order.items[0].product.image_link

    # Tạo notification
    notification = Notification(
        user_id=order.customer_id,
        title=title,
        body=body,
        image_url=image_url,
        order_id=order.id,
        is_read=False
    )

    # Thêm vào session (không commit ở đây)
    session.add(notification)