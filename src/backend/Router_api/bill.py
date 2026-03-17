from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from src.backend.connect_database import get_session
from src.backend.schemas import CreateBill, ResponseBill
from src.backend.services.bill_service import create_checkout_bill 
from src.backend.services.customer_service import check_exist_info_customer
from src.backend.auth import get_current_customer
router_bill = APIRouter(prefix="/bills", tags=["Bills"])

@router_bill.post("/add_bill", response_model=ResponseBill)
async def create_bill_endpoint(
    bill_data: CreateBill, 
    current_user = Depends(get_current_customer), 
    session: Session = Depends(get_session)
):
    # 1. Kiểm tra xem user có đủ thông tin địa chỉ, SĐT chưa
    if not check_exist_info_customer(current_user):
        raise HTTPException(
            status_code=400, 
            detail={"code": "MISSING_INFO", "message": "Vui lòng cập nhật đầy đủ thông tin giao hàng."}
        )
 
    try:
        # 3. Bắt đầu tạo hóa đơn
        result = await create_checkout_bill(bill_data=bill_data,customer_id= current_user.id, session=session)

        return result
    except Exception as e:
        print(f"API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        