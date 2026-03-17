from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer 
from fastapi import Depends, HTTPException, status
from sqlmodel import Session 

from src.backend.models import User, Customer , Seller # Nhớ import thêm Customer
from src.backend.connect_database import get_session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") 

SECRET_KEY = 'TOI_YEU_LAP_TRINH_FULLSTACK_AI'
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 

# URL này dùng cho Swagger UI biết chỗ để test login
oauth2_schema = OAuth2PasswordBearer(tokenUrl="/login")

def hash_password(password: str):
    return pwd_context.hash(password[:71])

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# --- 1. SỬA LẠI HÀM TẠO TOKEN ĐỂ NHẬN ROLE ---
def create_access_token(data: dict):
    """
    data truyền vào giờ đây nên có dạng: {"user_id": 1, "role": "customer"}
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- 2. TẠO HÀM LÕI ĐỂ GIẢI MÃ TOKEN ---
def decode_token(token: str = Depends(oauth2_schema)):
    """Chỉ làm nhiệm vụ giải mã và trả về payload, chưa query database vội"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác minh token",
        headers={"WWW-Authenticate": "Bearer"}
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print('user_id',payload)
        user_id: int = payload.get('user_id')
        auth: str = payload.get('auth') # Lấy role ra
         
        if user_id is None or auth is None:
            raise credentials_exception
            
        return {"user_id": user_id, "auth": auth}
    except JWTError:
        raise credentials_exception


# --- 3. TẠO CÁC HÀM PHÂN QUYỀN RIÊNG BIỆT ---

def get_current_member(payload: dict = Depends(decode_token), session: Session = Depends(get_session)):
    """Dành cho user làm task (role = 'member')"""
    if payload.get("auth") != "member":
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập. Yêu cầu tài khoản Member.")
        
    user = session.get(User, payload.get("user_id"))
    if user is None:
        raise HTTPException(status_code=401, detail="User không tồn tại")
    return user


def get_current_customer(payload: dict = Depends(decode_token), session: Session = Depends(get_session)):
   
    if payload.get("auth") != "customer":
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập. Yêu cầu tài khoản Customer.")
    print(payload)
    customer = session.get(Customer, payload.get("user_id"))
    if customer is None:
        raise HTTPException(status_code=401, detail="Customer không tồn tại")
        
    return customer


def get_current_admin(payload: dict = Depends(decode_token), session: Session = Depends(get_session)):
    """Dành cho Admin (role = 'admin')"""
    if payload.get("auth") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền thực hiện hành động này.")
        
    admin = session.get(User, payload.get("user_id")) # Giả sử admin cũng nằm trong bảng User
    if admin is None:
        raise HTTPException(status_code=401, detail="Admin không tồn tại")
    return admin


def get_current_seller(
    current_customer = Depends(get_current_customer), # 1. Lấy thông tin Customer từ Token
    db: Session = Depends(get_session)                # 2. Lấy kết nối Database
):
    """
    Dependency: Kiểm tra xem Customer hiện tại đã đăng ký Shop chưa.
    Nếu có, trả về object Seller (để lấy seller_id). Nếu chưa, chặn lại.
    """
    seller = db.query(Seller).filter(Seller.customer_id == current_customer.id).first()
    
    if not seller:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bạn chưa đăng ký Kênh người bán hoặc tài khoản không có quyền truy cập."
        )

    return seller