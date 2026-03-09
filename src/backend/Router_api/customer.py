from fastapi import APIRouter, Depends, HTTPException, Form , status
from sqlmodel import Session

# Import từ project của bạn
from src.backend.services.customer_service import create_customer_account, authenticate_customer
from src.backend.connect_database import get_session
from src.backend.auth import create_access_token

# LƯU Ý: Nhớ import Model Seller của bạn vào đây nhé (Sửa lại đường dẫn nếu cần)
from src.backend.models import Seller 

# Khởi tạo Router
router_customer = APIRouter(
    prefix="/customer",
)

# ... (Phần code API Đăng ký giữ nguyên) ...
@router_customer.post("/register")
def register(
    user_name: str = Form(...), 
    password: str = Form(...), 
    session: Session = Depends(get_session)
):
    """
    API Đăng ký tài khoản Khách hàng
    Nhận dữ liệu dạng Form Data.
    """
    # Chỉ log username, KHÔNG log password
    print(f"Bắt đầu xử lý đăng ký cho user_name: {user_name}")
    
    try:
        # Gọi tầng Service để xử lý logic (Băm mật khẩu + Lưu DB)
        new_customer = create_customer_account( 
            db=session,
            user_name=user_name, 
            password=password
        )
        
        return {
            "status": "success",
            "message": "Tạo tài khoản thành công!",
            "data": {
                "id": new_customer.id,
                "user_name": new_customer.user_name
            }
        }
        
    except HTTPException:
        # Re-raise lỗi HTTP (ví dụ service báo lỗi 400 do trùng tên đăng nhập)
        raise
    except Exception as e:
        # Log lỗi thực tế ra console/file để Dev sửa
        print(f"Lỗi hệ thống lúc đăng ký: {str(e)}") 
        # Trả về lỗi chung chung cho người dùng
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Đã xảy ra lỗi hệ thống, vui lòng thử lại sau."
        )


# --- 2. API ĐĂNG NHẬP (Nhận Form Data) ---
@router_customer.post("/login")
def login(
    user_name: str = Form(...), 
    password: str = Form(...), 
    session: Session = Depends(get_session)
):
    """
    API Đăng nhập cho Khách hàng. 
    Trả về Token chứa role='customer' và cờ has_shop (True/False).
    """
   
    try:
        print('b1')
        # 1. Xác thực tài khoản (Service)
        customer = authenticate_customer(
            db=session,
            user_name=user_name, 
            password=password
        )
        print('b3')
        # 2. Tạo Token và gắn Role
        token_data = {
            "user_id": customer.id,
            "auth": "customer"  
        }
        access_token = create_access_token(data=token_data)

        # 3. KIỂM TRA HAS_SHOP Ở ĐÂY
        # Đổi 'Seller' thành tên Model đúng của bạn (ví dụ Sell hoặc Seller)
        # Truy vấn xem có bản ghi nào trong bảng Seller có customer_id bằng với customer.id không
        seller_profile = session.query(Seller).filter(Seller.customer_id == customer.id).first()
        
        # Nếu tìm thấy -> True, nếu không tìm thấy (None) -> False
        has_shop_flag = True if seller_profile else False

        # 4. Trả về cho React
        return {
            "status": "success",
            "access_token": access_token,
            "token_type": "bearer",
            "has_shop": has_shop_flag,  # <--- Gắn cờ True/False vào đây
            "auth": "customer",
            "user_info": {
                "id": customer.id,
                "user_name": customer.user_name,
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))