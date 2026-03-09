from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError


from src.backend.models import Customer
from src.backend.auth import hash_password, verify_password

def create_customer_account(db: Session, user_name: str, password: str):
    # 1. Kiểm tra xem user_name đã tồn tại chưa
    existing_user = db.query(Customer).filter(Customer.user_name == user_name).first()
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
    # 1. Tìm user (Lúc này SQLAlchemy sẽ truy vấn đúng cột hashed_password)
    customer = db.query(Customer).filter(Customer.user_name == user_name).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
        )

    # 2. Kiểm tra mật khẩu với thuộc tính đã được viết đúng chính tả
    if not verify_password(password, customer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác",
        )
        
    return customer