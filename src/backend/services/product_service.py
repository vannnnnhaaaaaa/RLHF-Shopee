import os
import shutil
import uuid
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

# Import Model của bạn (Điều chỉnh lại đường dẫn)
from src.backend.models import Product, ProductImage

# --- HÀM HỖ TRỢ LƯU FILE ---
def save_upload_file(upload_file: UploadFile, folder_name: str) -> str:
    """
    Lưu file vào thư mục local 'static/...' và trả về đường dẫn tương đối.
    Sử dụng UUID để đổi tên file tránh trùng lặp.
    """
    try:
        # Tạo thư mục gốc nếu chưa tồn tại
        base_dir = f"static/uploads/{folder_name}"
        os.makedirs(base_dir, exist_ok=True)
        
        # Đổi tên file để đảm bảo không bị trùng lặp (ví dụ: a1b2c3d4.jpg)
        file_extension = os.path.splitext(upload_file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"
        
        file_path = os.path.join(base_dir, unique_filename)
        
        # Ghi file vào ổ cứng
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        return f"/{file_path}"
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Không thể lưu file {upload_file.filename}: {str(e)}"
        )


# --- HÀM XỬ LÝ CHÍNH ---
def create_new_product(
    db: Session,
    seller_id: int,
    product_data: dict,
    images: list[UploadFile],
    video: UploadFile | None = None
):
    try:
        # 1. Tạo đối tượng Product bằng cách bung dict (**)
        new_product = Product(
            seller_id=seller_id,
            **product_data
        )
        db.add(new_product)
        db.flush() # flush() để lấy được new_product.id mà chưa commit hẳn vào DB

        # 2. Xử lý Video (nếu có)
        if video and video.filename:
            video_url = save_upload_file(video, "videos")
            new_product.video_link = video_url

        # 3. Xử lý Ảnh và lưu vào bảng ProductImage
        primary_image_url = None
        
        for index, image_file in enumerate(images):
            # Lưu file ảnh vật lý
            img_url = save_upload_file(image_file, "images")
            
            is_primary = (index == 0) # Ảnh đầu tiên làm ảnh bìa
            if is_primary:
                primary_image_url = img_url
            
            # Tạo record trong bảng product_image
            new_product_image = ProductImage(
                product_id=new_product.id,
                image_url=img_url,
                is_primary=is_primary,
                display_order=index
            )
            db.add(new_product_image)

        # 4. Gắn ảnh chính vào cột image_link của bảng Product để tăng tốc độ load trang chủ
        if primary_image_url:
            new_product.image_link = primary_image_url

        # 5. Hoàn tất giao dịch Database
        db.commit()
        db.refresh(new_product)
        
        return new_product

    except SQLAlchemyError as db_error:
        db.rollback() # Hoàn tác DB nếu có lỗi
        raise Exception(f"Lỗi cơ sở dữ liệu: {str(db_error)}")
        
    except Exception as e:
        db.rollback()
        raise Exception(f"Lỗi xử lý hệ thống: {str(e)}")