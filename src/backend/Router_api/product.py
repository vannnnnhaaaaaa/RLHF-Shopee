from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

# Import từ project của bạn (Hãy điều chỉnh lại đường dẫn nếu cần)
from src.backend.connect_database import get_session
from src.backend.auth import get_current_seller 
from src.backend.services.product_service import create_new_product

router_product = APIRouter(
    prefix="/product",
   
)

@router_product.post("/add")
def add_product(
    # --- 1. Hứng dữ liệu Text (Form) ---
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    stock: int = Form(0),
    has_variants: bool = Form(False),
    weight: float = Form(0.0),
    length: float = Form(0.0),
    width: float = Form(0.0),
    height: float = Form(0.0),
    
    # --- 2. Hứng dữ liệu File ---
    images: List[UploadFile] = File(...), 
    video: Optional[UploadFile] = File(None), 
    
    # --- 3. Dependencies ---
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller) 
):
    """
    API Thêm sản phẩm mới (Nhận FormData chứa Text + File)
    """
    # Validate số lượng ảnh tối thiểu
    if len(images) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Vui lòng cung cấp ít nhất 5 hình ảnh cho sản phẩm."
        )

    # Gom toàn bộ text thành 1 Dictionary cho gọn gàng trước khi truyền xuống Service
    product_data_dict = {
        "name": name,
        "category": category,
        "description": description,
        "price": price,
        "stock": stock,
        "has_variants": has_variants,
        # Nếu model Product của bạn có các trường kích thước, mở comment bên dưới:
        "weight": weight,
        "length": length,
        "width": width,
        "height": height
    }
    print(product_data_dict)
    try:
        # Đẩy dữ liệu xuống Service xử lý DB và File
        new_product = create_new_product(
            db=session,
            seller_id=current_seller.id,
            product_data=product_data_dict,
            images=images,
            video=video ,
           
        )
        
    except HTTPException:
        raise # Quăng lại lỗi HTTP nếu Service cố tình văng lỗi (ví dụ file quá lớn)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Lỗi hệ thống khi thêm sản phẩm: {str(e)}"
        )

    # Trả về kết quả thành công
    return {
        "status": "success",
        "message": "Thêm sản phẩm thành công!",
        "data": {
            "product_id": new_product.id,
            "name": new_product.name,
            "image_link": new_product.image_link
        }
    }