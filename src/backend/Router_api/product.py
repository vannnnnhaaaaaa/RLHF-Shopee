from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, status ,Query
from sqlalchemy.orm import Session 
from typing import List, Optional
from sqlmodel import select
import json 
# Import từ project của bạn (Hãy điều chỉnh lại đường dẫn nếu cần)
from src.backend.connect_database import get_session
from src.backend.auth import get_current_seller 
from src.backend.services.product_service import get_product_by_id, create_new_product , get_products_by_seller , get_random_active_products
from src.backend.schemas import ProductListResponse
from src.backend.models import Product
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
    
    # --- 2. HỨNG DỮ LIỆU SKU (BIẾN THỂ) ---
    # Frontend sẽ gửi lên một chuỗi string (do JSON.stringify tạo ra)
    variants_list: Optional[str] = Form(None), 
    
    # --- 3. Hứng dữ liệu File ---
    images: List[UploadFile] = File(...), 
    video: Optional[UploadFile] = File(None), 
    
    # --- 4. Dependencies ---
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller) 
):
    """
    API Thêm sản phẩm mới (Hỗ trợ Sản phẩm thường & Sản phẩm có phân loại SKU)
    """
    # Validate số lượng ảnh tối thiểu
    if len(images) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Vui lòng cung cấp ít nhất 5 hình ảnh cho sản phẩm."
        )

    # --- XỬ LÝ CHUỖI JSON BIẾN THỂ (SKU) THÀNH LIST ---
    list_variants = []
    if has_variants:
        if not variants_list:
            raise HTTPException(
                status_code=400, 
                detail="Sản phẩm có phân loại nhưng không nhận được dữ liệu phân loại."
            )
        try:
            # Dịch ngược chuỗi String từ Frontend thành List[Dict] trong Python
            list_variants = json.loads(variants_list) 
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400, 
                detail="Dữ liệu phân loại (variants_data) sai định dạng JSON."
            )

    # Gom toàn bộ text thành 1 Dictionary cho gọn gàng
    product_data_dict = {
        "name": name,
        "category": category,
        "description": description,
        "price": price,
        "stock": stock,
        "has_variants": has_variants,
        "weight": weight,
        "length": length,
        "width": width,
        "height": height
    }

    try:
        # Đẩy toàn bộ dữ liệu xuống Service xử lý DB và File
        new_product = create_new_product(
            db=session,
            seller_id=current_seller.id,
            product_data=product_data_dict,
            images=images,
            video=video,
            variants_list=list_variants # Truyền list_variants xuống Service tại đây!
        )
        
    except HTTPException:
        # Quăng lại lỗi HTTP nếu Service chủ động văng lỗi (ví dụ: file quá lớn, trùng tên...)
        raise 
    except Exception as e:
        # Bắt các lỗi hệ thống không lường trước (lỗi SQL, lỗi code logic...)
        print(f"Lỗi Server khi thêm sản phẩm: {str(e)}") # Print ra terminal để dễ debug
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
            "name": new_product.name
        }
    }



@router_product.get("/list")
def get_my_products(
    # --- Query Parameters (Thông số truyền trên URL) ---
    status: Optional[str] = Query(None, description="Trạng thái: pending_inbound, rejected, removed... Để trống là lấy TẤT CẢ"),
    skip: int = Query(0, description="Bỏ qua bao nhiêu bản ghi (Dùng cho Trang 1, Trang 2...)"),
    limit: int = Query(50, description="Số lượng lấy tối đa mỗi lần gọi"),
    
    # --- Dependencies ---
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller)
):
    """
    API Lấy danh sách sản phẩm cho người bán (Quản lý kho)
    """
    try:
        # Gọi xuống tầng Service
        products = get_products_by_seller(
            db=session,
            seller_id=current_seller.id,
            status=status,
            skip=skip,
            limit=limit
        )
        
        return {
            "status": "success",
            "message": "Lấy danh sách sản phẩm thành công",
            "metadata": {
                "filter_status": status if status else "all",
                "count_returned": len(products)
            },
            "data": products
        }
        
    except Exception as e:
        print(f"Lỗi khi lấy danh sách sản phẩm: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi tải danh sách sản phẩm"
        )
@router_product.get(
    "/public/random", 
    response_model=ProductListResponse # <--- "PHÉP THUẬT" NẰM Ở ĐÂY
)
def get_random_homepage_products(
    limit: int = Query(24, description="Số lượng sản phẩm"),
    session: Session = Depends(get_session)
):
    try:
        raw_products = get_random_active_products(session, limit=limit)
        
        return {
            "status": "success",
            "data": raw_products
        }
    except Exception as e:
        print(f"Lỗi lấy sản phẩm random: {str(e)}")
        # FastAPI sẽ tự xử lý nếu trả về lỗi, nhưng để đúng chuẩn với React của bạn:
        return {"status": "error", "data": []}
    

@router_product.get("/public/{product_id}")
def get_detail_product(
    product_id: int, 
    session: Session = Depends(get_session)
):
    """
    API Công khai: Lấy chi tiết 1 sản phẩm dựa vào ID
    """
    try:
        # 1. Gọi xuống DB để tìm sản phẩm
        product = get_product_by_id(session, product_id)
        
        # 2. Xử lý trường hợp có người nhập bậy ID lên thanh URL (VD: /product/99999)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sản phẩm không tồn tại hoặc đã bị gỡ."
            )
            
        # 3. Ép kiểu an toàn loại bỏ embedding (hoặc dùng response_model như lúc nãy bạn đã tạo)
        product_dict = product.model_dump(exclude={"embedding"})

        return {
            "status": "success",
            "data": product_dict
        }
        
    except HTTPException:
        raise # Quăng lại lỗi 404 ra ngoài cho Frontend biết
    except Exception as e:
        print(f"Lỗi khi lấy chi tiết sản phẩm ID {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi tải chi tiết sản phẩm"
        )

@router_product.get("/search-by-name/{name}")
def search_product_by_name(
    name: str ,
    session: Session = Depends(get_session)
):
    try:
        statement = select(Product).where(Product.name.ilike(f"%{name}%"))
        result = session.exec(statement).first()
        print(result)
        return {
            "status": "success",
            "data": result.id,
          
        }
    except Exception as e:
        print(f"LỖI TÌM KIẾM: {e}") # In ra terminal để dễ debug
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")