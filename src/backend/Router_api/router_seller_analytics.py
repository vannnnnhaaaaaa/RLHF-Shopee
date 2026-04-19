from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from typing import Optional

from src.backend.connect_database import get_session
from src.backend.auth import get_current_seller
from src.backend.models import Seller, Product, Order, OrderItem

router_seller_analytics = APIRouter(prefix="/seller/analytics", tags=["Seller Analytics"])


@router_seller_analytics.get("/overview")
def get_seller_overview(
    current_seller: Seller = Depends(get_current_seller),
    session: Session = Depends(get_session),
):
    """
    Trả về 4 chỉ số tổng quan cho Seller Dashboard:
      - total_views:   Tổng lượt xem tất cả sản phẩm của seller.
      - total_orders:  Tổng số đơn hàng thành công (ACCEPT / DELIVERING / COMPLETED).
      - total_revenue: Tổng doanh thu từ các đơn thành công.
      - conversion_rate: Tỷ lệ chuyển đổi = (orders / views) * 100.
    """
    try:
        seller_id = current_seller.id

        # ── 1. total_views ──────────────────────────────────────────────────
        views_stmt = select(func.coalesce(func.sum(Product.view_count), 0)).where(
            Product.seller_id == seller_id
        )
        total_views = session.exec(views_stmt).one() or 0

        # ── 2. total_orders & total_revenue ────────────────────────────────
        # Đơn "thành công": ACCEPT, DELIVERING, COMPLETED
        successful_statuses = ("ACCEPT", "DELIVERING", "COMPLETED")

        # Lấy order_ids của seller thông qua OrderItem → Product
        orders_stmt = (
            select(Order.id, func.coalesce(func.sum(Order.total_price), 0).label("revenue"))
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == seller_id)
            .where(Order.status.in_(successful_statuses))
            .group_by(Order.id)
        )
        order_results = session.exec(orders_stmt).all()

        total_orders = len(order_results)
        total_revenue = sum(row.revenue for row in order_results) if order_results else 0

        # ── 3. conversion_rate ──────────────────────────────────────────────
        if total_views and total_views > 0:
            conversion_rate = round((total_orders / total_views) * 100, 2)
        else:
            conversion_rate = 0.0

        return {
            "status": "success",
            "data": {
                "total_views": int(total_views),
                "total_orders": total_orders,
                "total_revenue": float(total_revenue),
                "conversion_rate": conversion_rate,
            }
        }

    except Exception as e:
        print(f"Lỗi get_seller_overview: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi lấy thống kê tổng quan.")
