from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from src.backend.models import Customer
from src.backend.auth import get_session, get_current_customer
from src.backend.services.order_service import get_bill_customer

router_order = APIRouter(prefix='/order')

@router_order.get('/customer/get-status/{status}')
def get_status_bill(
    status: str, 
    page: int = 1,  # Thêm tham số page, mặc định là trang 1
    limit: int = 7, # Vẫn giữ limit mặc định là 7
    session: Session = Depends(get_session), 
    current_customer: Customer = Depends(get_current_customer)
):
    try:
        # Tính toán số lượng item cần bỏ qua dựa vào số trang
        offset = (page - 1) * limit
        
        results = get_bill_customer(
            status=status, 
            session=session, 
            current_id=current_customer.id,
            limit=limit,
            offset=offset # Truyền offset xuống service
        )
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))