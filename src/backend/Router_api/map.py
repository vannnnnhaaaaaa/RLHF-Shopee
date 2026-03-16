from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional

# Import get_session và model Map từ project của bạn
from src.backend.connect_database  import get_session 
from src.backend.models import Map 

router_map = APIRouter(prefix="/map")


@router_map.get("/get-locations")
def get_locations(
    parent_id: Optional[int] = None, 
    session: Session = Depends(get_session)
):
    try:
        # TỐI ƯU 1: Dùng is_(None) chuẩn hơn == None
        if parent_id is None:
            statement = select(Map).where(Map.parent_id.is_(None))
        else:
            statement = select(Map).where(Map.parent_id == parent_id)
            
        results = session.exec(statement).all()
        
        return {
            "status": "success", 
            "data": results,
            "message": "Lấy dữ liệu địa điểm thành công"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")


@router_map.get("/get-location/{location_id}")
def get_location_detail(
    location_id: int, 
    session: Session = Depends(get_session)
):
    # TỐI ƯU 2: Thêm block try...except để đảm bảo an toàn
    try:
        statement = select(Map).where(Map.id == location_id)
        result = session.exec(statement).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Không tìm thấy địa điểm")
            
        # TỐI ƯU 3: Bổ sung "message" cho đồng bộ với API trên
        return {
            "status": "success", 
            "data": result,
            "message": "Lấy chi tiết địa điểm thành công"
        }
    except HTTPException:
        # Bắt lại lỗi 404 ở trên để ném thẳng ra ngoài, không bị cuốn vào lỗi 500
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")