from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional

# Import get_session và model Map từ project của bạn
from src.backend.connect_database  import get_session 
from src.backend.models import Map 

router_map = APIRouter(prefix="/map", tags=["Map"])

@router_map.get("/get-locations")
def get_locations(
    parent_id: Optional[int] = None, 
    session: Session = Depends(get_session)
):
    try:
        # Nếu không có parent_id -> Lấy danh sách Tỉnh/Thành phố (Level 1)
        if parent_id is None:
            statement = select(Map).where(Map.parent_id == None)
        # Nếu có parent_id -> Lấy danh sách Quận/Huyện thuộc Tỉnh đó (Level 2)
        else:
            statement = select(Map).where(Map.parent_id == parent_id)
            
        # Thực thi câu lệnh query
        results = session.exec(statement).all()
        
        return {
            "status": "success", 
            "data": results,
            "message": "Lấy dữ liệu địa điểm thành công"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")