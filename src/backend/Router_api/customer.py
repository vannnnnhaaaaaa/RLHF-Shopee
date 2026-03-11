from fastapi import APIRouter, Depends, HTTPException, Form , status
from sqlmodel import Session

# Import từ project của bạn
from src.backend.services.customer_service import create_customer_account, authenticate_customer
from src.backend.connect_database import get_session
from src.backend.auth import create_access_token , get_current_customer

from src.backend.models import Seller , Customer , Map
from src.backend.schemas import UpdateProfile
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
  
    print(f"Bắt đầu xử lý đăng ký cho user_name: {user_name}")
    
    try:
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
        raise
    except Exception as e:
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
        customer = authenticate_customer(
            db=session,
            user_name=user_name, 
            password=password
        )
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
            "has_shop": has_shop_flag,  
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

@router_customer.get("/profile")
def get_profile(session: Session = Depends(get_session), customer : Customer = Depends(get_current_customer)):
    # Trả về thông tin cơ bản
    profile_data = {
        "id": customer.id,
        "full_name": customer.name,
        "phone_number": customer.number,
        "address_detail": customer.address_detail,
        "map_id": customer.map_id,
        "full_address_string": "" 
    }

    # Nếu khách đã có map_id (Quận/Huyện), ta lấy tên Quận và tên Thành phố
    if customer.map_id:
        district = session.get(Map, customer.map_id)
        if district and district.parent_id:
            city = session.get(Map, district.parent_id)
            # Tạo chuỗi: "Quận 1, Thành phố Hồ Chí Minh"
            profile_data["full_address_string"] = f"{district.name}, {city.name}"

    return {"status": "success", "data": profile_data}



@router_customer.patch('/updateprofile')
def update_profile (
    data_update : UpdateProfile  ,
    session : Session = Depends(get_session) ,
    current_customer : Customer = Depends(get_current_customer)
) :
    customer = session.get(Customer , current_customer.id)
    if not customer :
        raise HTTPException(status_code=404 , detail='không tim thấy người dùng ')
    customer.address_detail = data_update.address_detail
    customer.map_id = data_update.map_id
    customer.number = data_update.number 
    customer.name = data_update.name
    customer.note = data_update.note
    try :
        session.add(customer)
        session.commit()
        session.refresh(customer)
        return {'status': 'đã thêm thành công' }
    except Exception as e :
        raise HTTPException(status_code=500 , detail=f'Error {e}')
    