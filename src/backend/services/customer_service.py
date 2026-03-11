
from fastapi import HTTPException, status 
from sqlmodel import select , Session
from sqlalchemy.exc import IntegrityError
import os
from dotenv import load_dotenv
from supabase import create_client, Client

from src.backend.models import Customer
from src.backend.auth import hash_password, verify_password




def create_customer_account(db: Session, user_name: str, password: str):
    # 1. Kiểm tra xem user_name đã tồn tại chưa
    existing_user = db.exec(select(Customer).where(Customer.user_name == user_name)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập này đã tồn tại. Vui lòng chọn tên khác."
        )
        
    # 2. Băm mật khẩu
    # LƯU Ý: Tuyệt đối không lưu password gốc vào Database
    hashed_pwd = hash_password(password) 
    
    # 3. Tạo mới Customer (Chú ý tên cột là hashed_password)
    new_customer = Customer(
        user_name=user_name,
        hashed_password=hashed_pwd 
    )
    
    # 4. Lưu vào Database
    try:
        db.add(new_customer)
        db.commit()
        db.refresh(new_customer)
        return new_customer
    except IntegrityError:
        # Bắt lỗi an toàn nếu có ràng buộc DB nào đó bị vi phạm
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dữ liệu không hợp lệ hoặc đã tồn tại."
        )

def authenticate_customer(db: Session, user_name: str, password: str):
    # Trim khoảng trắng thừa
    clean_user_name = user_name.strip()
  
    # Tìm kiếm
    customer = db.exec(
        select(Customer).where(Customer.user_name == clean_user_name)
    ).first()
    
    if not customer:
        # Log để dev biết nhưng trả về lỗi chung cho user bảo mật
        print(f"DEBUG: Không tìm thấy user '{clean_user_name}' trong DB")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
        )

    if not verify_password(password, customer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
        )
        
    return customer