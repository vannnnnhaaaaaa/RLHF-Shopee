from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
# Import từ project của bạn
from src.backend.auth import get_current_customer
from src.backend.services.seller_service import create_seller_account
from src.backend.schemas import SellerCreateRequest
from src.backend.models import User , Seller , Customer
from src.backend.connect_database import get_session
router_seller = APIRouter(
    prefix="/seller",
)

@router_seller.post("/register")
# Giả sử đây là file service/crud của bạn
def create_seller_account( request_data: SellerCreateRequest ,db: Session = Depends(get_session), current_customer:  Customer = Depends(get_current_customer)):
    
    # 1. Chuyển đổi dữ liệu từ Pydantic Model sang Dictionary
    seller_data = request_data.model_dump() # Nếu dùng Pydantic v2 (hoặc request_data.dict() nếu dùng v1)
    
    new_seller = Seller(
        **seller_data,
        customer_id=current_customer.id  # <--- BẠN ĐANG THIẾU HOẶC TRUYỀN SAI Ở DÒNG NÀY
    )
    
    # 3. Lưu vào database
    db.add(new_seller)
    db.commit()
    db.refresh(new_seller)
    
    return new_seller