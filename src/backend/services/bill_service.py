from sqlmodel import Session, select
from fastapi import HTTPException
from datetime import datetime

# Import các model từ project của bạn (giả định tên file là models.py)
from src.backend.models import Product, CartItem, Bill, BillDetail
from src.backend.schemas import CreateBill
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
def create_checkout_bill(bill_data: CreateBill, customer_id: int, session: Session):
    try:
        calculated_product_total = 0.0
        purchased_product_ids = []

        # --- BƯỚC 1 & 2: KIỂM TRA TỒN KHO, TRỪ TỒN KHO, CỘNG LƯỢT BÁN VÀ TÍNH TIỀN ---
        for item in bill_data.details:
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

        # --- BƯỚC 3: TẠO BILL ---
        final_total_price = (
            calculated_product_total 
            + bill_data.total_shipping 
            - bill_data.discount_product 
            - bill_data.discount_shipping
        )

        new_bill = Bill(
            customer_id=customer_id,
            total_price=final_total_price, 
            total_shipping=bill_data.total_shipping,
            status=bill_data.status,
            payment_method=bill_data.payment_method,
            payment_status=bill_data.payment_status,
            discount_product=bill_data.discount_product,
            discount_shipping=bill_data.discount_shipping,
            shopee_voucher_id=bill_data.shopee_voucher_id,
            seller_voucher_id=bill_data.seller_voucher_id,
            created_at=datetime.now()
        )
        session.add(new_bill)
        session.flush()

        # --- BƯỚC 4: TẠO BILL DETAIL ---
        for item in bill_data.details:
            db_product = session.get(Product, item.product_id)
            bill_detail = BillDetail(
                bill_id=new_bill.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price_at_purchase=db_product.price 
            )
            session.add(bill_detail)

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
        session.refresh(new_bill)

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
        print(f"Transaction Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi xử lý thanh toán.")