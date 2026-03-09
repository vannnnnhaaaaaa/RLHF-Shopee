from sqlalchemy.orm import Session
from fastapi import HTTPException
from src.backend.models import Seller 

def create_seller_account(db: Session, seller_data: dict, customer_id: int):

    existing_seller = db.query(Seller).filter(Seller.customer_id == customer_id).first()
    if existing_seller:
        raise HTTPException(
            status_code=400, 
            detail="Tài khoản này đã được đăng ký làm Người Bán!"
        )

    # 2. Map dữ liệu vào Model Database
    new_seller = Seller(
        
        shop_name=seller_data.shop_name,
        phone_number=seller_data.phone_number,
        email=seller_data.email,
        city=seller_data.city,
        detailed_address=seller_data.detailed_address,
        cccd_number=seller_data.cccd_number,
        bank_name=seller_data.bank_name,
        bank_account=seller_data.bank_account,
        bank_holder=seller_data.bank_holder
    )

    # 3. Lưu vào Database
    try:
        db.add(new_seller)
        db.commit()
        db.refresh(new_seller) # Cập nhật lại object để lấy được ID vừa tạo
        return new_seller
    except Exception as e:
        db.rollback()
        print(f"Lỗi khi insert database: {e}")
        raise HTTPException(status_code=500, detail="Không thể tạo tài khoản người bán lúc này.")