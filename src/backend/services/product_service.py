import os
import uuid
from typing import List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session , select , func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import defer
# Import các Models của bạn
from src.backend.models import Product, Product_image

# Load biến môi trường
load_dotenv()

# Khởi tạo Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Chưa cấu hình SUPABASE_URL hoặc SUPABASE_KEY trong file .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- HÀM HỖ TRỢ UPLOAD LÊN SUPABASE ---
def upload_to_supabase(upload_file: UploadFile, folder: str) -> str:
    """
    Đẩy file lên Supabase Storage và trả về link Public URL.
    """
    try:
        # 1. Đọc dữ liệu file
        file_content = upload_file.file.read()
        
        # 2. Tạo đường dẫn duy nhất: folder/uuid.extension
        file_ext = os.path.splitext(upload_file.filename)[1]
        file_path = f"{folder}/{uuid.uuid4().hex}{file_ext}"
        
        # 3. Thực hiện upload (sử dụng service_role key nên sẽ bypass được RLS)
        supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": upload_file.content_type}
        )
        
        # 4. Lấy link công khai
        return supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
    
    except Exception as e:
        print(f"Cloud Storage Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi upload file {upload_file.filename} lên Cloud."
        )
    finally:
        upload_file.file.close()

# --- HÀM LOGIC CHÍNH: TẠO SẢN PHẨM ---
def create_new_product(
    db: Session, 
    seller_id: int, 
    product_data: dict, 
    images: List[UploadFile], 
    video: Optional[UploadFile] = None
):
    """
    Quy trình: Upload Media -> Lưu Product -> Lưu danh sách ProductImage.
    """
    try:
        # Bước 1: Upload toàn bộ ảnh lên Supabase
        image_urls = []
        for img in images:
            url = upload_to_supabase(img, "product_images")
            image_urls.append(url)
            
        primary_image_url = image_urls[0] if image_urls else None

        # Bước 2: Upload Video (nếu có)
        video_url = None
        if video and video.filename:
            video_url = upload_to_supabase(video, "product_videos")

        # Bước 3: Tạo bản ghi Product trong DB
        new_product = Product(
            **product_data,
            seller_id=seller_id,
            image_link=primary_image_url,
            video_link=video_url
        )
        db.add(new_product)
        db.flush() # Để lấy được new_product.id

        # Bước 4: Lưu thông tin chi tiết vào bảng ProductImage (để load slide)
        for index, url in enumerate(image_urls):
            img_entry = Product_image(
                product_id=new_product.id,
                image_url=url,
                is_primary=(index == 0),
                display_order=index
            )
            db.add(img_entry)

        # Bước 5: Commit toàn bộ giao dịch
        db.commit()
        db.refresh(new_product)
        return new_product

    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi lưu dữ liệu vào Database.")
    except Exception as e:
        db.rollback()
        print(f"General Error: {str(e)}")
        raise e

def get_products_by_seller(
    db: Session, 
    seller_id: int, 
    status: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 50
):
    """
    Lấy danh sách sản phẩm của người bán.
    - Hỗ trợ lọc theo status (nếu có).
    - Hỗ trợ phân trang để tối ưu hiệu năng.
    """
    # Bước 1: Khởi tạo câu truy vấn gốc (chỉ lấy của người bán này)
    statement = select(Product).where(Product.seller_id == seller_id)
    
    # Bước 2: Nếu Frontend có truyền status lên, ta thêm điều kiện WHERE
    if status:
        statement = statement.where(Product.status == status)
        
    # Bước 3: Sắp xếp sản phẩm mới nhất lên đầu và áp dụng phân trang
    statement = statement.order_by(Product.id.desc()).offset(skip).limit(limit)
    
    # Bước 4: Thực thi truy vấn
    results = db.exec(statement).all()
    
    return results

def get_random_active_products(db: Session, limit: int = 20):
    """
    Lấy ngẫu nhiên các sản phẩm đang hoạt động (Tránh lấy 1 cục cùng danh mục)
    Dùng cho trang chủ Shopee.
    """
    # Chỉ lấy sản phẩm trạng thái 'active' (Trên kệ)
    # Sắp xếp ngẫu nhiên bằng func.random()
    statement = (
        select(Product)
        .where(Product.status == 'active') 
        .options(defer(Product.embedding))
        .order_by(func.random()) 
        .limit(limit)
    )
    
    results = db.exec(statement).all()
    return results

def get_product_by_id(db: Session, product_id: int):
    """
    Lấy thông tin chi tiết của 1 sản phẩm theo ID.
    Bỏ qua cột embedding để tối ưu tốc độ.
    """
    statement = (
        select(Product)
        .where(Product.id == product_id)
        .where(Product.status == 'active') # Khách chỉ xem được hàng đang bán
        .options(defer(Product.embedding)) # Khóa chặt embedding lại
    )
    
    # Dùng .first() vì ID là duy nhất, lấy ra dòng đầu tiên tìm thấy
    result = db.exec(statement).first() 
    return result