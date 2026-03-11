from fastapi import APIRouter, Depends , HTTPException
from sqlmodel import Session , delete 
 

# Điều chỉnh lại đường dẫn import cho khớp với project của bạn
from src.backend.connect_database import get_session
from src.backend.auth import get_current_customer 
from src.backend.services.cart_service import add_item_to_cart , get_cart_items
from src.backend.schemas import AddToCartRequest
from src.backend.models import CartItem

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
   
    try:
        cart_data = get_cart_items(session, current_customer.id)
        
        return {
            "status": "success",
            "data": cart_data
        }
    except Exception as e:
        print(f"Lỗi khi lấy giỏ hàng: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi tải giỏ hàng")
    
@router_cart.delete('/remove/{cartId}' )
def removeCartItem (
    cartId : int ,session : Session = Depends(get_session) ,
    customer = Depends(get_current_customer)
):
    cartItem =  session.get(CartItem , cartId)
    try :
        session.delete(cartItem)
        session.commit()
    except Exception as e :
        session.rollback()
        HTTPException(status_code=404 , detail=f'Error {e}')


@router_cart.patch('/increaseitem/{cartId}')
def add_quatity_CartItem(
    cartId : int ,
    session : Session = Depends(get_session) ,
    customer = Depends(get_current_customer) 
):
    cart = session.get(CartItem , cartId)
    if not cart :
       raise HTTPException(status_code=404, detail="Không tìm thấy mục giỏ hàng này")

    if cart.customer_id != customer.id :
        raise HTTPException(status_code=403 , detail='Bạn k có đủ quyền hạn sửa')
    try :
        cart.quantity +=1 
        session.add(cart)
        session.commit()
        return {"status": "success", "message": "Đã thêm sản phẩm vào giỏ hàng"}
    except Exception as e :
        session.rollback()
        raise HTTPException(status_code=500 , detail= f'Error : {e}')
    
    
@router_cart.patch('/decrease/{cartId}')
def minus_quatity_CartItem(
    cartId : int ,
    session : Session = Depends(get_session) ,
    customer = Depends(get_current_customer) 
):
    cart = session.get(CartItem , cartId)
    if not cart :
        raise HTTPException(status_code=404, detail="Không tìm thấy mục giỏ hàng này")
    if cart.quantity <= 1:
        raise HTTPException(status_code=400, detail="Số lượng không thể nhỏ hơn 1")
    if cart.customer_id != customer.id :
        raise HTTPException(status_code=403 , detail='Bạn k có đủ quyền hạn sửa')
    try :
        cart.quantity -=1
        session.add(cart)
        session.commit()
        return {"status": "success", "message": "Đã bỏ bớt sản phẩm ra khởi giỏ hàng"}
    except Exception as e :
        session.rollback()
        raise HTTPException(status_code=500 , detail= f'Error : {e}')

@router_cart.post('/remove-multiple') # Dùng POST vì gửi body là list
def remove_multiple_items(
    cart_ids: list[int], 
    session: Session = Depends(get_session),
    customer = Depends(get_current_customer)
):
    try:
        # Xóa tất cả các cart_id nằm trong danh sách và thuộc về đúng customer
        statement = delete(CartItem).where(
            CartItem.id.in_(cart_ids),
            CartItem.customer_id == customer.id
        )
        session.exec(statement)
        session.commit()
        return {"status": "success", "message": f"Đã xóa {len(cart_ids)} sản phẩm"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))