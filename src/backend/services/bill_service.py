from sqlmodel import Session, select
from fastapi import HTTPException
from datetime import datetime

# Import các model từ project của bạn (giả định tên file là models.py)
from src.backend.models import Product, CartItem, Order, OrderItem
from src.backend.schemas import CreateOrder
# --- CÁC HÀM NHIỆM VỤ NHỎ (HELPER FUNCTIONS) ---

def get_cart_items(customer_id: int, session: Session):
    """Lấy toàn bộ sản phẩm trong giỏ hàng của user"""
    statement = select(CartItem).where(CartItem.customer_id == customer_id)
    cart_items = session.exec(statement).all()
    
    if not cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng đang trống, không thể thanh toán." )
    return cart_items

def process_inventory_and_calculate_total(cart_items: list[CartItem], session: Session) -> float:
    """Vừa kiểm tra tồn kho, vừa trừ số lượng, vừa tính tổng tiền"""
    total_price = 0.0
    
    for item in cart_items:
        # 1. Lấy thông tin sản phẩm từ DB
        product = session.get(Product, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Sản phẩm ID {item.product_id} không tồn tại.")
            
        # 2. Kiểm tra tồn kho
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Sản phẩm '{product.name}' chỉ còn {product.stock} sản phẩm, không đủ số lượng."
            )
            
        # 3. Trừ tồn kho (Cập nhật trực tiếp object product)
        product.stock -= item.quantity
        session.add(product) # Đưa vào hàng đợi lưu
        
        # 4. Cộng dồn tổng tiền
        total_price += product.price * item.quantity
        
    return total_price

def clear_customer_cart(customer_id: int, session: Session):
    """Xóa sạch giỏ hàng của user sau khi đặt hàng thành công"""
    statement = select(CartItem).where(CartItem.customer_id == customer_id)
    items_to_delete = session.exec(statement).all()
    
    for item in items_to_delete:
        session.delete(item)
def create_checkout_order(order_data: CreateOrder, customer_id: int, session: Session):
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
            
            # THÊM MỚI: Tăng số lượng đã bán (sold_count)
            # Dùng .get() hoặc kiểm tra None để phòng trường hợp DB đang có giá trị NULL
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
    

