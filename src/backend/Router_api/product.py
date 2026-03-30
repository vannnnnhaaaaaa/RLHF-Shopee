from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, status ,Query
from sqlalchemy.orm import Session , selectinload
from typing import List, Optional
from sqlmodel import select
import json 
# Import từ project của bạn (Hãy điều chỉnh lại đường dẫn nếu cần)
from src.backend.connect_database import get_session
from src.backend.auth import get_current_seller 
from src.backend.services.product_service import get_product_by_id, create_new_product , get_products_by_seller , get_random_active_products ,       update_product_service

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
    variantsList: Optional[str] = Form(None), 
    
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
    print(variantsList)
    if has_variants:
        if not variantsList:
            raise HTTPException(
                status_code=400, 
                detail="Sản phẩm có phân loại nhưng không nhận được dữ liệu phân loại."
            )
        try:
            # Dịch ngược chuỗi String từ Frontend thành List[Dict] trong Python
            list_variants = json.loads(variantsList) 
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
        "status" : 'active',
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
    # --- Query Parameters ---
    status: Optional[str] = Query(None, description="Trạng thái: pending_inbound, rejected, removed..."),
    skip: int = Query(0, description="Bỏ qua bao nhiêu bản ghi"),
    limit: int = Query(50, description="Số lượng lấy tối đa mỗi lần gọi"),
    
    # --- Dependencies ---
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller)
):
    """
    API Lấy danh sách sản phẩm cho người bán kèm theo Phân loại hàng (SKU)
    """
    try:
        products = get_products_by_seller(
            db=session,
            seller_id=current_seller.id,
            status=status,
            skip=skip,
            limit=limit
        )
        
        cleaned_products = []
        for p in products:
            # Lấy data của sản phẩm cha, bỏ cột embedding nặng nề
            p_dict = p.model_dump(exclude={"embedding"})
            
            # Khởi tạo mảng skus cho JSON trả về
            skus_data = []
            total_stock = 0
            prices = []
            
            # Xử lý các SKU con (nếu sản phẩm có chia phân loại)
            if p.skus:
                for sku in p.skus:
                    skus_data.append(sku.model_dump())
                    total_stock += sku.stock  # Giả sử bảng SKU của bạn có cột 'stock'
                    prices.append(sku.price)  # Giả sử bảng SKU có cột 'price'
            else:
                # Nếu sản phẩm không có phân loại, lấy kho và giá của sản phẩm gốc
                total_stock = p.stock if hasattr(p, 'stock') else 0
                prices = [p.price] if hasattr(p, 'price') else [0]
                
            # Đóng gói dữ liệu tổng hợp cho UI
            p_dict["skus"] = skus_data
            p_dict["total_stock"] = total_stock
            p_dict["price_min"] = min(prices) if prices else 0
            p_dict["price_max"] = max(prices) if prices else 0
            
            cleaned_products.append(p_dict)
        
        return {
            "status": "success",
            "message": "Lấy danh sách sản phẩm thành công",
            "metadata": {
                "filter_status": status if status else "all",
                "count_returned": len(products)
            },
            "data": cleaned_products
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
    API Công khai: Lấy chi tiết 1 sản phẩm dựa vào ID + toàn bộ hình ảnh từ product_image table
    """
    try:
        # 1. Query DB kết hợp Eager Loading để lấy luôn dữ liệu từ bảng images
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .options(selectinload(Product.images))  # ← Eager load toàn bộ images
        )
        product = session.exec(statement).first()
        
        # 2. Xử lý trường hợp không tìm thấy sản phẩm
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sản phẩm không tồn tại hoặc đã bị gỡ."
            )
            
        # 3. Ép kiểu an toàn loại bỏ embedding
        product_dict = product.model_dump(exclude={"embedding"})
        
        # 4. Gắn mảng images vào response (từ bảng product_image)
        product_dict["images"] = [img.model_dump() for img in product.images] if product.images else []

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


@router_product.get("/seller/{product_id}")
def get_product_detail_for_seller(
    product_id: int, 
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller) # Bắt buộc phải đăng nhập
):
    """
    API Dành riêng cho Kênh Người Bán: 
    Lấy chi tiết sản phẩm + Hình ảnh + Các phân loại (SKU) để điền vào Form Edit
    """
    try:
        # 1. Query DB kết hợp Eager Loading để lấy luôn data từ bảng Image và SKU
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .where(Product.seller_id == current_seller.id) # BẢO MẬT: Chỉ lấy SP của chính người bán này
            .options(
                selectinload(Product.images),
                selectinload(Product.skus)
            )
        )
        product = session.exec(statement).first()

        # 2. Bắt lỗi nếu không tìm thấy SP (hoặc SP này của người khác)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sản phẩm không tồn tại hoặc bạn không có quyền truy cập."
            )

        # 3. Ép kiểu an toàn và loại bỏ cột embedding nặng nề
        product_dict = product.model_dump(exclude={"embedding"})

        # 4. Gắn thủ công mảng images và skus vào JSON trả về
        # (Vì model_dump() đôi khi không tự động parse các relationship nếu cấu hình Schema thiếu)
        product_dict["images"] = [img.model_dump() for img in product.images] if product.images else []
        product_dict["skus"] = [sku.model_dump() for sku in product.skus] if product.skus else []

        return {
            "status": "success",
            "message": "Lấy thông tin sản phẩm thành công",
            "data": product_dict
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi khi lấy chi tiết SP (Seller) ID {product_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi hệ thống khi tải thông tin sản phẩm"
        )
# 1. NHỚ IMPORT HÀM NÀY VÀO TRÊN CÙNG:
# from src.backend.services.product_service import update_product_service

@router_product.put("/edit/{product_id}")
def update_product_endpoint(
    product_id: int,
    # --- Text Data ---
    name: str = Form(...), category: str = Form(...), description: str = Form(...),
    price: float = Form(...), stock: int = Form(0), has_variants: bool = Form(False),
    weight: float = Form(0.0), length: float = Form(0.0), width: float = Form(0.0), height: float = Form(0.0),
    
    # --- JSON Strings ---
    variantsList: Optional[str] = Form(None), 
    tiersList: Optional[str] = Form(None),     # [THÊM MỚI] Hứng list Tên phân loại
    existingImages: Optional[str] = Form(None), 
    
    # --- Files ---
    newImages: Optional[List[UploadFile]] = File(None), 
    video: Optional[UploadFile] = File(None), 
    
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller) 
):
    # Parse JSON
    list_variants = []
    list_tiers = []
    
    if has_variants:
        if variantsList:
            list_variants = json.loads(variantsList)
        if tiersList:
            list_tiers = json.loads(tiersList) # Giải mã JSON tiers

    list_existing_images = []
    if existingImages:
        list_existing_images = json.loads(existingImages)

    product_data_dict = {
        "name": name, "category": category, "description": description,
        "price": price, "stock": stock, "has_variants": has_variants,
        "weight": weight, "length": length, "width": width, "height": height
    }

    try:
        updated_product = update_product_service(
            db=session,
            product_id=product_id,
            seller_id=current_seller.id,
            product_data=product_data_dict,
            list_variants=list_variants,
            list_tiers=list_tiers, # [THÊM MỚI] Truyền xuống Service
            list_existing_images=list_existing_images,
            new_images=newImages,
            video=video
        )
        
        return {
            "status": "success",
            "message": "Cập nhật sản phẩm thành công",
            "data": {"product_id": updated_product.id}
        }
    except HTTPException:
        raise
    except Exception as e:
        # Dòng này sẽ in nguyên nhân chính xác ra màn hình đen (Terminal) của Backend
        print(f"Lỗi hệ thống khi update SP: {str(e)}") 
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi cập nhật sản phẩm")