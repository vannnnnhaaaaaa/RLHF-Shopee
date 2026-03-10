from fastapi import APIRouter, Depends , HTTPException
from sqlmodel import Session


# Điều chỉnh lại đường dẫn import cho khớp với project của bạn
from src.backend.connect_database import get_session
from src.backend.auth import get_current_customer 
from src.backend.services.cart_service import add_item_to_cart , get_cart_items
from src.backend.schemas import AddToCartRequest
router_cart = APIRouter(prefix="/cart")




@router_cart.post("/add")
def add_to_cart_api(
    request: AddToCartRequest,
    session: Session = Depends(get_session),
    current_customer = Depends(get_current_customer) 
):
    """
    API Thêm sản phẩm vào giỏ hàng (Yêu cầu Token Khách Hàng)
    """
    result = add_item_to_cart(
        db=session,
        customer_id=current_customer.id,
        product_id=request.product_id,
        quantity=request.quantity
    )
    return result

@router_cart.get("/my-cart")
def get_my_cart_api(
    session: Session = Depends(get_session),
    current_customer = Depends(get_current_customer) # Bắt buộc phải đăng nhập mới lấy được
):
    """
    API Lấy toàn bộ giỏ hàng của user đang đăng nhập
    """
    try:
        cart_data = get_cart_items(session, current_customer.id)
        
        return {
            "status": "success",
            "data": cart_data
        }
    except Exception as e:
        print(f"Lỗi khi lấy giỏ hàng: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi tải giỏ hàng")