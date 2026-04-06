from pydantic import BaseModel , Field 
from typing import Optional ,Any

class ProductFilters (BaseModel) :
    search_text: Optional[str]  = Field(default=None, description="Tên sản phẩm cốt lõi hoặc từ khóa (VD: 'áo thun polo', 'bàn làm việc')")
    min_price: Optional[int] = Field(default=None, description="Giá tối thiểu (VNĐ)")
    max_price: Optional[int] = Field(default=None, description="Giá tối đa (VNĐ)")
    category: Optional[str] = Field(default=None, description="Danh mục sản phẩm nếu có (VD: 'thời trang', 'điện tử')")
    attributes : Optional[dict[str,Any]] = Field(
        default=None, 
        description="Các thuộc tính chi tiết dạng key-value. VD: {'size': 'XL', 'color': 'đen', 'pages': 200, 'material': 'gỗ'}"
    )
class RouterOutputFiltering (BaseModel) :
    intent : str = Field(description="Phân loại intent: 'greeting', 'search_product', 'out_of_scope'")
    filters: Optional[ProductFilters] = Field(default=None, description="Chỉ cung cấp dữ liệu nếu intent là 'search_product'. Trích xuất toàn bộ điều kiện tìm kiếm.")