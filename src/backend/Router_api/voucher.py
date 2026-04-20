from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func # Bổ sung import func
from datetime import datetime

from src.backend.connect_database import get_session
from src.backend.models import Voucher
from src.backend.schemas import VoucherResponse 

# [FIX 1]: Đổi prefix thành /public, và khai báo route cụ thể là /vouchers để tránh lỗi dấu gạch chéo
router_public_voucher = APIRouter(prefix="/public")

# =====================================================================
# GET /public/vouchers?shop_id=123
# =====================================================================
@router_public_voucher.get("/vouchers", response_model=dict)
def get_public_vouchers(
    shop_id: int = Query(..., description="ID của shop (seller) cần lấy voucher"),
    session: Session = Depends(get_session)
):
    """
    Lấy danh sách các voucher ĐANG CÓ HIỆU LỰC của một Shop.
    """
    print(f"Lấy danh sách voucher của shop {shop_id}")
    try:
       
        stmt = (
            select(Voucher)
            .where(
                Voucher.seller_id == shop_id,              
                Voucher.creator_type == "seller",          
                Voucher.is_active == True,                 
                Voucher.valid_from <= func.now(),   # Database tự kiểm tra thời gian hiện tại
                Voucher.valid_until > func.now(),   # Database tự kiểm tra thời gian hiện tại
                Voucher.used_count < Voucher.quantity      
            )
            .order_by(Voucher.discount_value.desc())       
        )
        
        valid_vouchers = session.exec(stmt).all()

        data_list = [VoucherResponse.model_validate(v).model_dump() for v in valid_vouchers]

        return {
            "status": "success",
            "message": "Lấy danh sách voucher hợp lệ thành công",
            "data": data_list
        }

    except Exception as e:
        session.rollback()
        print(f"Lỗi API get_public_vouchers: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi tải danh sách voucher.")