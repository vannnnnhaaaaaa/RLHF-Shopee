from sqlmodel import select, Session, delete, func
from src.backend.models import Order, OrderItem, Product, CartItem, Voucher
from src.backend.schemas import CreateOrder
from fastapi import HTTPException
from datetime import datetime
from src.backend.services.notification_service import create_order_status_notification
from src.backend.services.notification_service import create_notification


def get_seller_dashboard_stats(seller_id: int, session: Session):
    """
    Đếm số đơn hàng theo từng trạng thái và sản phẩm cho Seller Dashboard.
    Trả về dict gồm: pending_count, accepted_count, cancellation_request_count,
    out_of_stock_count, locked_products_count.
    """
    try:
        def count_orders(status: str) -> int:
            stmt = (
                select(func.count(Order.id.distinct()))
                .join(OrderItem, Order.id == OrderItem.order_id)
                .join(Product, OrderItem.product_id == Product.id)
                .where(Product.seller_id == seller_id)
                .where(Order.status == status)
            )
            return session.exec(stmt).one() or 0

        def count_products(condition) -> int:
            stmt = select(func.count(Product.id)).where(
                Product.seller_id == seller_id,
                condition
            )
            return session.exec(stmt).one() or 0

        return {
            "pending_count":                count_orders("PENDING"),
            "accepted_count":               count_orders("ACCEPT"),
            "cancellation_request_count":   count_orders("PROCESSING_CANCEL"),
            "out_of_stock_count":           count_products(Product.stock == 0),
            "locked_products_count":         count_products(Product.status == "locked"),
        }
    except Exception as e:
        print(f"Lỗi get_seller_dashboard_stats: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi lấy thống kê dashboard.")


def get_customer_orders(status: str, current_id: int, session: Session, limit: int = 7, offset: int = 0):
    try:
        normalized_status = status.upper()

        # ==========================================
        # BƯỚC 1: LẤY DANH SÁCH ORDER (Có phân trang chuẩn)
        # ==========================================
        statement_order = select(Order).where(Order.customer_id == current_id)

        if normalized_status != 'ALL':
            statement_order = statement_order.where(Order.status == normalized_status)

        statement_order = statement_order.order_by(Order.created_at.desc())
        statement_order = statement_order.limit(limit).offset(offset)
        orders = session.exec(statement_order).all()

        if not orders:
            return []

        # ==========================================
        # BƯỚC 2: JOIN LẤY SẢN PHẨM TỪ ORDERITEM VÀ PRODUCT (Chống N+1 Query)
        # ==========================================
        order_ids = [o.id for o in orders]

        statement_items = select(OrderItem, Product).join(
            Product, OrderItem.product_id == Product.id
        ).where(
            OrderItem.order_id.in_(order_ids)
        )

        item_results = session.exec(statement_items).all()

        # ==========================================
        # BƯỚC 3: GOM NHÓM DỮ LIỆU THÀNH JSON CHO REACT
        # ==========================================
        order_dict = {
            order.id: {
                **order.model_dump(),
                "items": []
            }
            for order in orders
        }

        for order_item, product in item_results:
            order_dict[order_item.order_id]["items"].append({
                "id": order_item.id,
                "product_id": product.id,
                "product_category": product.category,
                "product_name": product.name,
                "product_image": product.image_link,
                "quantity": order_item.quantity,
                "price_at_purchase": order_item.price_at_purchase or 0
            })

        return list(order_dict.values())

    except Exception as e:
        print(f"Lỗi truy vấn đơn hàng Customer: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi lấy danh sách đơn hàng.")


def _rollback_vouchers(session: Session, vouchers_to_update: list):
    """Hoàn lại quantity và used_count của các voucher đã bị trừ."""
    for vu in vouchers_to_update:
        vu["voucher"].quantity = vu["old_quantity"]
        vu["voucher"].used_count = vu["old_used_count"]
        session.add(vu["voucher"])


def create_checkout_orders(order_data: CreateOrder, customer_id: int, session: Session):
    """
    Tạo đơn hàng mới từ dữ liệu checkout.

    Luồng xử lý:
    1. Validate voucher → ghi nhận trạng thái cũ → trừ used_count
       → Nếu order thất bại: rollback voucher
    2. Validate tồn kho (chỉ kiểm tra, chưa trừ)
       → Nếu đủ: trừ stock & tăng sold_count
    3. Tính tiền → tạo Order (seller_voucher_ids: int4[])
    4. Tạo OrderItems
    5. Xóa CartItems
    6. Commit
    7. Tạo thông báo
    """
    # === BƯỚC 0: VALIDATE VOUCHER & GHI NHẬN TRẠNG THÁI ĐỂ ROLLBACK ===
    applied_voucher_ids = order_data.seller_voucher_ids or []
    vouchers_to_update = []

    for voucher_id in applied_voucher_ids:
        voucher = session.get(Voucher, voucher_id)
        if not voucher:
            raise HTTPException(status_code=404, detail=f"Voucher ID {voucher_id} không tồn tại.")
        if voucher.quantity is None or voucher.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"Voucher '{voucher.code}' đã hết lượt sử dụng."
            )
        vouchers_to_update.append({
            "voucher": voucher,
            "old_quantity": voucher.quantity,
            "old_used_count": voucher.used_count or 0,
            "new_quantity": voucher.quantity - 1,
            "new_used_count": (voucher.used_count or 0) + 1,
        })

    # Trừ voucher ngay: quantity--, used_count++
    for vu in vouchers_to_update:
        vu["voucher"].quantity = vu["new_quantity"]
        vu["voucher"].used_count = vu["new_used_count"]
        session.add(vu["voucher"])

    # === BƯỚC 1: VALIDATE TỒN KHO (chỉ kiểm tra, chưa trừ) ===
    products_to_update = []

    for item in order_data.details:
        product = session.get(Product, item.product_id)
        if not product:
            # Rollback voucher đã trừ
            _rollback_vouchers(session, vouchers_to_update)
            raise HTTPException(status_code=404, detail=f"Sản phẩm ID {item.product_id} không tồn tại.")

        if product.stock < item.quantity:
            _rollback_vouchers(session, vouchers_to_update)
            raise HTTPException(
                status_code=400,
                detail=f"Sản phẩm '{product.name}' chỉ còn {product.stock} sản phẩm, không đủ để đặt."
            )

        products_to_update.append({
            "product": product,
            "old_stock": product.stock,
            "old_sold_count": product.sold_count or 0,
            "new_stock": product.stock - item.quantity,
            "new_sold_count": (product.sold_count or 0) + item.quantity,
        })

    # === BƯỚC 2: TRỪ TỒN KHO THỰC SỰ ===
    for pu in products_to_update:
        pu["product"].stock = pu["new_stock"]
        pu["product"].sold_count = pu["new_sold_count"]
        session.add(pu["product"])

    # === BƯỚC 3: TÍNH TIỀN & TẠO ORDER ===
    final_prices_dict = {}
    calculated_product_total = 0.0

    for item in order_data.details:
        product = session.get(Product, item.product_id)
        original_price = product.price or 0
        discount_percent = getattr(product, 'discount_percent', 0) or 0
        final_price = (
            round(original_price * (1 - discount_percent / 100))
            if discount_percent > 0 else original_price
        )
        final_prices_dict[item.product_id] = final_price
        calculated_product_total += final_price * item.quantity

    final_total_price = (
        calculated_product_total
        + order_data.total_shipping
        - order_data.discount_product
        - order_data.discount_shipping
    )

    new_order = Order(
        customer_id=customer_id,
        total_price=max(0, final_total_price),
        total_shipping=order_data.total_shipping,
        status=order_data.status,
        payment_method=order_data.payment_method,
        payment_status=order_data.payment_status,
        discount_product=order_data.discount_product,
        discount_shipping=order_data.discount_shipping,
        shopee_voucher_id=order_data.shopee_voucher_id,
        # seller_voucher_ids: Python list [1, 2] → SQLAlchemy ARRAY(INTEGER) → PostgreSQL int4[] {1, 2}
        seller_voucher_ids=order_data.seller_voucher_ids or [],
        created_at=datetime.now()
    )
    session.add(new_order)
    session.flush()

    # === BƯỚC 4: TẠO ORDER ITEMS ===
    for item in order_data.details:
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price_at_purchase=final_prices_dict[item.product_id]
        )
        session.add(order_item)

    # === BƯỚC 5: XÓA GIỎ HÀNG ===
    purchased_product_ids = [item.product_id for item in order_data.details]
    if purchased_product_ids:
        for cart_item in session.exec(select(CartItem).where(
            CartItem.customer_id == customer_id,
            CartItem.product_id.in_(purchased_product_ids)
        )).all():
            session.delete(cart_item)

    # === BƯỚC 6: COMMIT ===
    session.commit()
    session.refresh(new_order)

    # === BƯỚC 7: THÔNG BÁO ===
    try:
        for item in order_data.details:
            product = session.get(Product, item.product_id)
            if product:
                create_notification(
                    session=session,
                    user_id=new_order.customer_id,
                    title="Đặt hàng thành công!",
                    body=f"Sản phẩm '{product.name}' đã được đưa vào đơn hàng #{new_order.id}.",
                    order_id=new_order.id,
                    image_url=product.image_link
                )
        session.commit()
    except Exception as noti_error:
        print(f"Warning: Could not create notification: {noti_error}")

    return {
        "status": "success",
        "message": "Đặt hàng thành công",
        "order_id": new_order.id
    }


def update_status_logic(session: Session, customer_id: int, status: str, order_id: int):
    try:
        statement = select(Order).where(Order.id == order_id, Order.customer_id == customer_id)
        order = session.exec(statement).first()
        if not order:
            raise HTTPException(status_code=404, detail='Không tìm thấy đơn hàng của bạn')

        allow_status = ['CANCELLED', 'COMPLETED']
        if status not in allow_status:
            raise HTTPException(status_code=403, detail='Bạn không có quyền chuyển sang trạng thái này')

        order.status = status
        session.add(order)
        session.commit()
        session.refresh(order)

        try:
            image_url = None
            if order.items and len(order.items) > 0:
                product = session.get(Product, order.items[0].product_id)
                if product:
                    image_url = product.image_link

            if status == 'CANCELLED':
                create_notification(
                    session=session,
                    user_id=order.customer_id,
                    title="Đơn hàng đã bị hủy ❌",
                    body=f"Đơn hàng #{order.id} đã bị hủy. Vui lòng liên hệ người bán để biết thêm chi tiết.",
                    order_id=order.id,
                    image_url=image_url
                )
            elif status == 'COMPLETED':
                create_notification(
                    session=session,
                    user_id=order.customer_id,
                    title="Đơn hàng đã hoàn thành 🎉",
                    body=f"Đơn hàng #{order.id} đã được giao thành công. Cảm ơn bạn đã mua hàng!",
                    order_id=order.id,
                    image_url=image_url
                )
            session.commit()
        except Exception as noti_error:
            print(f"Warning: Could not create notification for order {order.id}: {noti_error}")

    except Exception as e:
        raise e
