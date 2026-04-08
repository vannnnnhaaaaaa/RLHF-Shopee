from sqlmodel import select, Session, delete
# Cập nhật từ Bill/BillDetail sang Order/OrderItem
from src.backend.models import Order, OrderItem, Product, CartItem
from src.backend.schemas import CreateOrder
from fastapi import HTTPException
from datetime import datetime 
from src.backend.services.notification_service import create_order_status_notification 
from src.backend.services.notification_service import create_notification
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
        # Limit và Offset đếm chuẩn xác số lượng Order
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
                
                # FIX TẠI ĐÂY: Đổi tên key thành price_at_purchase để khớp 100% với Frontend 
                # (Kèm "or 0" để lỡ data cũ chưa có giá thì không bị crash)
                "price_at_purchase": order_item.price_at_purchase or 0
            })

        return list(order_dict.values())
        
    except Exception as e:
        print(f"Lỗi truy vấn đơn hàng Customer: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi lấy danh sách đơn hàng.")

def create_checkout_orders(order_data: CreateOrder, customer_id: int, session: Session):
    """
    Tạo đơn hàng mới từ dữ liệu checkout
    """
    try:
        calculated_product_total = 0.0
        purchased_product_ids = []
        
        # Tạo Dictionary để lưu lại giá bán cuối cùng (đã trừ discount) của từng sản phẩm
        final_prices_dict = {} 

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
            
            # Trừ tồn kho & Tăng số lượng đã bán
            product.stock -= item.quantity
            current_sold = product.sold_count if product.sold_count is not None else 0
            product.sold_count = current_sold + item.quantity
            
            session.add(product)
            
            # FIX: Tính toán giá bán đã trừ phần trăm giảm giá (Giống API preview)
            original_price = product.price or 0
            discount_percent = getattr(product, 'discount_percent', 0) or 0
            if discount_percent > 0:
                final_price = round(original_price * (1 - discount_percent / 100))
            else:
                final_price = original_price

            # Lưu lại mức giá chốt đơn này để dùng cho BƯỚC 4
            final_prices_dict[item.product_id] = final_price

            # Tính tiền dựa trên giá ĐÃ GIẢM
            calculated_product_total += final_price * item.quantity
            purchased_product_ids.append(item.product_id)

        # --- BƯỚC 3: TẠO 1 ORDER CHUNG (Gánh tổng tiền) ---
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

        # --- BƯỚC 4: TẠO N ORDER ITEM (Chi tiết từng sản phẩm) ---
        for item in order_data.details:
            # FIX: KHÔNG CẦN CHỌC VÀO DB LẦN NỮA, LẤY THẲNG GIÁ TỪ DICTIONARY ĐÃ TÍNH Ở BƯỚC 1
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_purchase=final_prices_dict[item.product_id] 
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

        # --- BƯỚC 6: COMMIT LƯU DATABASE ---
        session.commit()
        session.refresh(new_order)

        # --- BƯỚC 7: TẠO N THÔNG BÁO CHO N SẢN PHẨM ---
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
            print(f"Warning: Could not create notification for order {new_order.id}: {noti_error}")

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

def update_status_logic (session : Session , customer_id : int , status : str , order_id : int) :
    try :
        statement = select(Order).where(Order.id == order_id , Order.customer_id == customer_id)
        order = session.exec(statement).first()
        if not order :
            raise HTTPException (status_code=404 , detail='Khoong tim thay donw hang cua ban')
        
        allow_status = ['CANCELLED' , 'COMPLETED']
        if status not in allow_status :
            raise HTTPException(status_code=403 , detail='Bạn không có quyền chuyển sang trạng thái này')
    

        order.status = status
        session.add(order)
        session.commit()
        session.refresh(order)
        
        # Create notification for specific status changes
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
            session.commit()  # Commit the notification
        except Exception as noti_error:
            print(f"Warning: Could not create notification for order {order.id}: {noti_error}")
    except Exception as e :
        
        raise e
