from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from typing import Optional
from sqlmodel import select, func
from datetime import datetime

from src.backend.connect_database import get_session
from src.backend.auth import get_current_customer
from src.backend.models import Review, Product, Order, OrderItem, Customer
from src.backend.schemas import CreateOrder

router_review = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)


# ============================================================
# HELPER: Phân tích cảm xúc (Sentiment Analysis)
# ============================================================
def analyze_sentiment(text: str, rating: int) -> float:
    """
    Tính sentiment_score từ -1.0 (tiêu cực) đến 1.0 (tích cực).
    
    Hiện tại dùng logic hybrid:
    - Base score từ rating: 1★→-0.6, 2★→-0.2, 3★→0.0, 4★→0.5, 5★→0.8
    - Từ khóa tích cực/tiêu cực trong text → điều chỉnh thêm ±0.1–0.3
    
    Về sau cắm LLM vào đây để thay thế logic này.
    """
    text_lower = text.lower().strip()

    # --- Base score từ rating ---
    rating_scores = {1: -0.6, 2: -0.2, 3: 0.0, 4: 0.5, 5: 0.8}
    score = rating_scores.get(rating, 0.0)

    # --- Từ khóa tích cực → tăng score ---
    positive_keywords = [
        "tuyệt vời", "tốt", "hài lòng", "đẹp", "chuẩn", "ổn",
        "ngon", "rẻ", "nhanh", "đáng mua", "yêu", "mềm", "mịn",
        "chất", "vừa", "vẫn", "giao", "đóng gói", "cẩn thận",
        "awesome", "good", "nice", "love", "fast", "great", "perfect"
    ]
    # --- Từ khóa tiêu cực → giảm score ---
    negative_keywords = [
        "tệ", "dở", "hỏng", "bể", "rác", "mắc", "chậm", "mỏng",
        "lem", "nhạt", "không đáng", "thất vọng", "hối hận",
        "bad", "terrible", "worst", "slow", "broken", "fake", "scam"
    ]

    pos_count = sum(1 for kw in positive_keywords if kw in text_lower)
    neg_count = sum(1 for kw in negative_keywords if kw in text_lower)

    score += min(pos_count * 0.1, 0.3)   # tối đa +0.3
    score -= min(neg_count * 0.15, 0.45)  # tối đa -0.45

    return round(max(-1.0, min(1.0, score)), 3)


# ============================================================
# API 1: Tạo đánh giá
# POST /reviews/create
# ============================================================
@router_review.post("/create")
def create_review(
    request_data: dict,
    session: Session = Depends(get_session),
    current_customer: Customer = Depends(get_current_customer)
):
    """
    Tạo đánh giá sản phẩm kèm phân tích cảm xúc.

    Payload:
        product_id, order_id, rating (1-5), content

    Bảo mật:
        1. Customer phải có đơn hàng chứa product_id này với trạng thái COMPLETED.
        2. Đơn hàng chưa từng được đánh giá cho sản phẩm này.
    """
    product_id = request_data.get("product_id")
    order_id = request_data.get("order_id")
    rating = request_data.get("rating")
    content = request_data.get("content", "").strip()

    # --- Validation cơ bản ---
    if not all([product_id, order_id, rating]):
        raise HTTPException(status_code=400, detail="Thiếu product_id, order_id hoặc rating.")

    if not (1 <= rating <= 5):
        raise HTTPException(status_code=400, detail="Rating phải từ 1 đến 5.")

    if not content:
        raise HTTPException(status_code=400, detail="Nội dung đánh giá không được để trống.")

    try:
        # --- Bảo mật 1: Kiểm tra đơn hàng thuộc về customer ---
        order = session.exec(
            select(Order).where(
                Order.id == order_id,
                Order.customer_id == current_customer.id,
                Order.status == "COMPLETED"
            )
        ).first()

        if not order:
            raise HTTPException(
                status_code=403,
                detail="Đơn hàng không hợp lệ hoặc chưa hoàn thành. Không thể đánh giá."
            )

        # --- Bảo mật 2: Kiểm tra đơn hàng có chứa sản phẩm này không ---
        item_in_order = session.exec(
            select(OrderItem).where(
                OrderItem.order_id == order_id,
                OrderItem.product_id == product_id
            )
        ).first()

        if not item_in_order:
            raise HTTPException(
                status_code=403,
                detail="Sản phẩm không nằm trong đơn hàng này."
            )

        # --- Bảo mật 3: Chống spam — mỗi order × product chỉ đánh giá 1 lần ---
        existing_review = session.exec(
            select(Review).where(
                Review.order_id == order_id,
                Review.product_id == product_id,
                Review.customer_id == current_customer.id
            )
        ).first()

        if existing_review:
            raise HTTPException(
                status_code=409,
                detail="Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi."
            )

        # --- Bảo mật 4: Kiểm tra sản phẩm tồn tại ---
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại.")

        # --- AI: Phân tích cảm xúc ---
        sentiment_score = analyze_sentiment(content, rating)

        # --- Lưu Review ---
        new_review = Review(
            content=content,
            rating=rating,
            sentiment_score=sentiment_score,
            product_id=product_id,
            order_id=order_id,
            customer_id=current_customer.id
        )
        session.add(new_review)
        session.commit()
        session.refresh(new_review)

        return {
            "status": "success",
            "message": "Đánh giá đã được gửi thành công!",
            "data": {
                "review_id": new_review.id,
                "sentiment_score": sentiment_score,
                "sentiment_label": (
                    "Tích cực" if sentiment_score > 0.1
                    else "Tiêu cực" if sentiment_score < -0.1
                    else "Trung lập"
                )
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"Lỗi tạo đánh giá: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi gửi đánh giá."
        )


# ============================================================
# API 2: Lấy danh sách đánh giá theo sản phẩm
# GET /products/{product_id}/reviews
# ============================================================
@router_review.get("/product/{product_id}")
def get_product_reviews(
    product_id: int,
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(10, ge=1, le=50, description="Số đánh giá mỗi trang"),
    session: Session = Depends(get_session)
):
    """
    Lấy danh sách đánh giá của sản phẩm.
    - Sắp xếp: mới nhất lên đầu (created_at DESC).
    - Join thông tin customer (chỉ lấy tên, ẩn danh 1 phần).
    - Có phân trang.
    """
    try:
        offset = (page - 1) * limit

        # --- Đếm tổng số đánh giá ---
        count_stmt = select(func.count(Review.id)).where(Review.product_id == product_id)
        total = session.exec(count_stmt).one() or 0

        if total == 0:
            return {
                "status": "success",
                "data": {
                    "reviews": [],
                    "pagination": {
                        "total": 0,
                        "page": page,
                        "limit": limit,
                        "total_pages": 0
                    },
                    "stats": {"average_rating": 0.0, "total": 0}
                }
            }

        # --- Lấy danh sách đánh giá + join customer ---
        stmt = (
            select(Review, Customer.name)
            .join(Customer, Review.customer_id == Customer.id)
            .where(Review.product_id == product_id)
            .order_by(Review.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        results = session.exec(stmt).all()

        # --- Tính rating trung bình ---
        avg_stmt = select(func.avg(Review.rating)).where(Review.product_id == product_id)
        average_rating = session.exec(avg_stmt).one() or 0.0

        # --- Gom dữ liệu ---
        reviews_data = []
        for review, customer_name in results:
            # Ẩn danh: "Nguyễn Văn A" → "Ng***n A"
            masked_name = _mask_name(customer_name or "Khách hàng")

            reviews_data.append({
                "id": review.id,
                "rating": review.rating,
                "content": review.content,
                "sentiment_score": review.sentiment_score,
                "sentiment_label": (
                    "Tích cực" if review.sentiment_score > 0.1
                    else "Tiêu cực" if review.sentiment_score < -0.1
                    else "Trung lập"
                ),
                "customer_name": masked_name,
                "created_at": review.created_at.isoformat() if review.created_at else None
            })

        return {
            "status": "success",
            "data": {
                "reviews": reviews_data,
                "pagination": {
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": (total + limit - 1) // limit
                },
                "stats": {
                    "average_rating": round(average_rating, 2),
                    "total": total
                }
            }
        }

    except Exception as e:
        print(f"Lỗi lấy danh sách đánh giá: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi tải đánh giá."
        )


# ============================================================
# HELPER: Ẩn danh tên khách hàng
# ============================================================
def _mask_name(name: str) -> str:
    """
    Ẩn danh tên: giữ lại chữ cái đầu và cuối, thay phần giữa bằng '***'.
    Ví dụ: "Nguyễn Văn A" → "Ng***n A"
    """
    name = name.strip()
    parts = name.split()
    if len(parts) == 1:
        # "Minh" → "M***h"
        if len(name) <= 2:
            return name[0] + "***"
        return name[0] + "***" + name[-1]
    else:
        # "Nguyễn Văn A" → "Ng***n A"
        first = parts[0]
        last = parts[-1]
        middle = "***"
        if len(first) <= 1:
            first_part = first
        else:
            first_part = first[0] + "***" + first[-1]
        return " ".join([first_part] + parts[1:-1] + [last])
