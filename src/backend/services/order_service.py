from sqlmodel import select, Session, delete
# Cập nhật từ Bill/BillDetail sang Order/OrderItem
from src.backend.models import Order, OrderItem, Product, CartItem
from src.backend.schemas import CreateOrder
from fastapi import HTTPException
from datetime import datetime 

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
        # Limit và Offset ở đây sẽ chuẩn xác là đếm số lượng Order
        statement_order = statement_order.limit(limit).offset(offset)
        orders = session.exec(statement_order).all()

        # Nếu không có order nào, ngưng luôn và trả về mảng rỗng
        if not orders:
            return []

        # ==========================================
        # BƯỚC 2: JOIN LẤY SẢN PHẨM TỪ ORDERITEM VÀ PRODUCT
        # ==========================================
        # Lấy danh sách các ID của Order vừa tìm được
        order_ids = [o.id for o in orders]

        # Query JOIN giữa OrderItem và Product
        statement_items = select(OrderItem, Product).join(
            Product, OrderItem.product_id == Product.id
        ).where(
            OrderItem.order_id.in_(order_ids) # Chỉ lấy item của những order đang hiển thị
        )
        
        # Kết quả trả về là list các tuple: [(OrderItem, Product), (OrderItem, Product)...]
        item_results = session.exec(statement_items).all()

        # ==========================================
        # BƯỚC 3: GOM NHÓM DỮ LIỆU THÀNH JSON CHO REACT
        # ==========================================
        # Tạo một dictionary để nhét items vào đúng order của nó
        order_dict = {
            order.id: {
                **order.model_dump(), # Lấy toàn bộ info của Order (total_price, status...)
                "items": []          # Tạo sẵn mảng rỗng để hứng sản phẩm
            }
            for order in orders
        }

        # Lặp qua kết quả JOIN để nhét sản phẩm vào mảng items tương ứng
        for order_item, product in item_results:
            order_dict[order_item.order_id]["items"].append({
                "product_id": product.id,
                "product_category" : product.category ,
                "product_name": product.name,
                "product_image": product.image_link,
                "quantity": order_item.quantity,
                "price": order_item.price_at_purchase
            })

        # Trả về một mảng chứa các object hoàn chỉnh
        return list(order_dict.values())
        
    except Exception as e:
        raise Exception(f"Database Error: {e}")


def create_checkout_orders(order_data: CreateOrder, customer_id: int, session: Session):
    """
    Tạo đơn hàng mới từ dữ liệu checkout
    """
    try:
        calculated_product_total = 0.0
        purchased_product_ids = []

        # --- BƯỚC 1 & 2: KIỂM TRA TỒN KHO, TRỪ TỒN KHO, CỘNG LƯỢT BÁN VÀ TÍNH TIỀN ---
        for item in order_data.details:
            product = session.get(Product, item.product_id)
            
            if not product:
                raise HTTPException(status_code=404, detail=f"Sản phẩm ID {item.product_id} không tồn tại.")
            
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Sản phẩm '{product.name}' chỉ còn {product.stock} sản phẩm."
                )
            
            # Trừ tồn kho
            product.stock -= item.quantity
            
            # Tăng số lượng đã bán (sold_count)
            current_sold = product.sold_count if product.sold_count is not None else 0
            product.sold_count = current_sold + item.quantity
            
            session.add(product)
            
            # Tính tiền dựa trên giá gốc trong DB
            calculated_product_total += product.price * item.quantity
            purchased_product_ids.append(item.product_id)

        # --- BƯỚC 3: TẠO ORDER ---
        final_total_price = (
            calculated_product_total 
            + order_data.total_shipping 
            - order_data.discount_product 
            - order_data.discount_shipping
        )

        new_order = Order(
            customer_id=customer_id,
            total_price=final_total_price, 
            total_shipping=order_data.total_shipping,
            status=order_data.status,
            payment_method=order_data.payment_method,
            payment_status=order_data.payment_status,
            discount_product=order_data.discount_product,
            discount_shipping=order_data.discount_shipping,
            shopee_voucher_id=order_data.shopee_voucher_id,
            seller_voucher_id=order_data.seller_voucher_id,
            created_at=datetime.now()
        )
        session.add(new_order)
        session.flush()

        # --- BƯỚC 4: TẠO ORDER ITEM ---
        for item in order_data.details:
            db_product = session.get(Product, item.product_id)
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_purchase=db_product.price 
            )
            session.add(order_item)

        # --- BƯỚC 5: XÓA CÁC SẢN PHẨM ĐÃ MUA KHỎI GIỎ HÀNG ---
        if purchased_product_ids:
            statement = select(CartItem).where(
                CartItem.customer_id == customer_id,
                CartItem.product_id.in_(purchased_product_ids)
            )
            items_to_delete = session.exec(statement).all()
            for cart_item in items_to_delete:
                session.delete(cart_item)

        # --- BƯỚC 6: COMMIT ---
        session.commit()
        session.refresh(new_order)

        return {
            "status": "success", 
            "message": "Đặt hàng thành công", 
            "order_id": new_order.id
        }

    except HTTPException as http_exc:
        session.rollback()
        raise http_exc
    except Exception as e:
        session.rollback()
        print(f"Transaction Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi xử lý thanh toán.")