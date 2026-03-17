from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

# Import get_session và model Map từ project của bạn
from src.backend.connect_database  import get_session 
from src.backend.models import Map 

router_map = APIRouter(prefix="/map", tags=["Map"])

# API 1: Lấy danh sách Tỉnh/Thành (Level 1)
@router_map.get("/get-locations")
def get_locations(session: Session = Depends(get_session)):
    try:
        statement = select(Map).where(Map.parent_id.is_(None))
        results = session.exec(statement).all()
        
        return {
            "status": "success", 
            "data": results,
            "message": "Lấy danh sách Tỉnh/Thành thành công"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")

# API 2: Lấy danh sách Quận/Huyện theo ID của Tỉnh/Thành
@router_map.get("/get-districts")
def get_district_location_by_city(
    city_id: int, # FastAPI tự động bắt query ?city_id=...
    session: Session = Depends(get_session)
):
    try :
        statement = select(Map).where(Map.parent_id == city_id)
        result = session.exec(statement).all()
        
        # Sửa lại cấu trúc return để React có thể gọi res.data.data
        return {
            "status": "success",
            "data": result,
            "message": "Lấy danh sách Quận/Huyện thành công"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")
    
# API 3: Lấy chi tiết 1 địa điểm để truy ngược ra Tỉnh/Thành
@router_map.get("/get-location/{location_id}")
def get_location_detail(
    location_id: int, 
    session: Session = Depends(get_session)
):
    try:
        statement = select(Map).where(Map.id == location_id)
        result = session.exec(statement).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Không tìm thấy địa điểm")
            
        return {
            "status": "success", 
            "data": result,
            "message": "Lấy chi tiết địa điểm thành công"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")