from sqlmodel import Session, select
from fastapi import HTTPException
from datetime import datetime

# Import các model từ project của bạn (giả định tên file là models.py)
from src.backend.models import Product, CartItem, Bill, BillDetail

# --- CÁC HÀM NHIỆM VỤ NHỎ (HELPER FUNCTIONS) ---

def get_cart_items(customer_id: int, session: Session):
    """Lấy toàn bộ sản phẩm trong giỏ hàng của user"""
    statement = select(CartItem).where(CartItem.customer_id == customer_id)
    cart_items = session.exec(statement).all()
    
    if not cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng đang trống, không thể thanh toán.")
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


# --- HÀM NHẠC TRƯỞNG (GOM TRANSACTION) ---

def create_checkout_bill(
    customer_id: int, 
    address_id: int, # Truyền thêm ID địa chỉ giao hàng
    note: str, 
    session: Session
):
    """
    Hàm xử lý luồng thanh toán chính.
    Nếu có bất kỳ lỗi nào xảy ra ở các hàm con, toàn bộ thay đổi sẽ bị HỦY (Rollback).
    """
    try:
        # BƯỚC 1: Lấy danh sách sản phẩm trong giỏ
        cart_items = get_cart_items(customer_id, session)
        
        # BƯỚC 2 & 3: Kiểm tra, trừ tồn kho và tính tổng tiền
        total_price = process_inventory_and_calculate_total(cart_items, session)
        
        # BƯỚC 4: Tạo record cho bảng Bill (Hóa đơn cha)
        new_bill = Bill(
            customer_id=customer_id,
            map_id=address_id,
            total_price=total_price,
            note=note,
            status="pending", # Trạng thái chờ xử lý
            created_at=datetime.now()
        )
        session.add(new_bill)
        session.flush() # Đẩy tạm xuống DB để lấy được ID của new_bill ngay lập tức
        
        # BƯỚC 5: Tạo các record cho bảng BillDetail (Chi tiết hóa đơn)
        for item in cart_items:
            # Truy vấn lại giá sản phẩm để lưu giá tại thời điểm mua
            product = session.get(Product, item.product_id) 
            
            bill_detail = BillDetail(
                bill_id=new_bill.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=product.price
            )
            session.add(bill_detail)
            
        # BƯỚC 6: Xóa giỏ hàng
        clear_customer_cart(customer_id, session)
        
        # BƯỚC 7: NẾU MỌI THỨ OK -> COMMIT LƯU VĨNH VIỄN
        session.commit()
        session.refresh(new_bill) # Lấy data mới nhất cập nhật vào object
        
        return {
            "status": "success", 
            "message": "Đặt hàng thành công", 
            "bill_id": new_bill.id
        }
        
    except HTTPException as http_exc:
        session.rollback()
        raise http_exc
        
    except Exception as e:
    
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi thanh toán: {str(e)}")