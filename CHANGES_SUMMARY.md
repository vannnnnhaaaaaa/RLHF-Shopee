# 📋 Tóm Tắt Thay Đổi: Hiển Thị Ảnh Sản Phẩm Trong Đơn Hàng

## 🎯 Mục Đích
Sửa lỗi: Hệ thống chỉ load ảnh chính (primary image) của sản phẩm trong chi tiết đơn hàng. Giờ hệ thống sẽ hiển thị **toàn bộ danh sách ảnh** kèm carousel để khách hàng xem hết các ảnh của sản phẩm.

---

## 📝 Danh Sách File Thay Đổi

### 1️⃣ **Backend: `src/backend/schemas.py`** ✅
**Thay đổi:** Thêm schema mới cho ảnh sản phẩm và cập nhật `ResponseOrderItem`

**Code Cũ:**
```python
class ResponseOrderItem(SQLModel):
    id: int
    product_id: int
    quantity: int
    price_at_purchase: float
```

**Code Mới:**
```python
# Schema mới cho ảnh sản phẩm
class ProductImageSchema(SQLModel):
    id: int
    image_url: str
    is_primary: bool
    display_order: int
    
    class Config:
        from_attributes = True


# Updated ResponseOrderItem với thông tin ảnh
class ResponseOrderItem(SQLModel):
    id: int
    product_id: int
    quantity: int
    price_at_purchase: float
    
    # Thêm thông tin sản phẩm
    product_name: str
    product_category: Optional[str] = None
    product_image: str  # ảnh chính (primary)
    product_images: list[ProductImageSchema] = []  # danh sách tất cả ảnh
    
    class Config:
        from_attributes = True
```

**Giải thích:**
- Thêm `ProductImageSchema` để định nghĩa cấu trúc của 1 ảnh sản phẩm
- Thêm `product_name`, `product_category` vào `ResponseOrderItem` để có đầy đủ thông tin sản phẩm
- Thêm `product_images` là list chứa tất cả ảnh của sản phẩm (bao gồm ảnh từ bảng `product_image`)

---

### 2️⃣ **Backend: `src/backend/services/order_service.py`** ✅
**Thay đổi:** Import `Product_image` và cập nhật hàm `get_customer_orders()` để load tất cả ảnh

**Import mới:**
```python
from src.backend.models import Order, OrderItem, Product, CartItem, Product_image  # ← Thêm Product_image
```

**Hàm `get_customer_orders()` - Phần cũ (chỉ lấy 1 ảnh chính):**
```python
for order_item, product in item_results:
    order_dict[order_item.order_id]["items"].append({
        "product_id": product.id,
        "product_category" : product.category ,
        "product_name": product.name,
        "product_image": product.image_link,  # ← Chỉ 1 ảnh
        "quantity": order_item.quantity,
        "price": order_item.price_at_purchase
    })
```

**Hàm `get_customer_orders()` - Phần mới (lấy tất cả ảnh):**
```python
for order_item, product in item_results:
    # ==========================================
    # BƯỚC 4: LẤY TẤT CẢ ẢNH CỦA SẢN PHẨM
    # ==========================================
    statement_images = select(Product_image).where(
        Product_image.product_id == product.id
    ).order_by(Product_image.is_primary.desc(), Product_image.display_order.asc())
    
    images = session.exec(statement_images).all()
    
    # Convert images to dict format
    product_images = [
        {
            "id": img.id,
            "image_url": img.image_url,
            "is_primary": img.is_primary,
            "display_order": img.display_order
        }
        for img in images
    ]
    
    order_dict[order_item.order_id]["items"].append({
        "id": order_item.id,
        "product_id": product.id,
        "product_category": product.category,
        "product_name": product.name,
        "product_image": product.image_link,  # Ảnh chính (primary)
        "product_images": product_images,      # ← Tất cả ảnh
        "quantity": order_item.quantity,
        "price": order_item.price_at_purchase
    })
```

**Giải thích:**
- Query lấy tất cả `Product_image` từ DB với điều kiện `product_id` khớp
- Sắp xếp theo `is_primary DESC` (ảnh chính lên đầu) rồi `display_order ASC` (theo thứ tự hiển thị)
- Convert list ảnh thành dict format để API trả về
- Thêm `product_images` vào response

---

### 3️⃣ **Frontend: `src/frontend/src/components/OrderCard/OrderCard.jsx`** ✅
**Thay đổi:** Thêm state cho carousel ảnh và render danh sách ảnh phụ

**Thêm state mới:**
```javascript
const [selectedImageIndex, setSelectedImageIndex] = useState(0); // ← Quản lý ảnh hiện tại
```

**Function lấy danh sách ảnh:**
```javascript
const getProductImages = () => {
  if (!order?.items || order.items.length === 0) {
    return [];
  }
  
  const firstItem = order.items[0];
  if (firstItem.product_images && Array.isArray(firstItem.product_images)) {
    return firstItem.product_images;
  }
  
  // Fallback: nếu không có product_images, tạo array từ product_image
  if (firstItem.product_image) {
    return [{ image_url: firstItem.product_image, is_primary: true, display_order: 0 }];
  }
  
  return [];
};

const productImages = getProductImages();
const currentImageUrl = productImages.length > 0 
  ? productImages[selectedImageIndex]?.image_url || order.items?.[0]?.product_image 
  : order.items?.[0]?.product_image;
```

**UI - Phần cũ (chỉ 1 ảnh):**
```jsx
<div className="product-image-placeholder">
  {order.items && order.items.length > 0 ? (
    <img
      src={order.items[0].product_image}
      alt="Product"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  ) : "Ảnh"}
</div>
```

**UI - Phần mới (carousel + thumbnails):**
```jsx
<div className="product-image-container">
  <div className="product-image-placeholder">
    {currentImageUrl ? (
      <img
        src={currentImageUrl}
        alt="Product"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    ) : "Ảnh"}
  </div>

  {/* Danh sách ảnh phụ (Thumbnails) */}
  {productImages.length > 1 && (
    <div className="product-thumbnails">
      {productImages.map((img, index) => (
        <div
          key={index}
          className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
          onClick={() => setSelectedImageIndex(index)}
        >
          <img
            src={img.image_url}
            alt={`Thumbnail ${index + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ))}
    </div>
  )}
</div>
```

**Giải thích:**
- Thêm state `selectedImageIndex` để quản lý ảnh đang được hiển thị
- Function `getProductImages()` lấy danh sách ảnh từ API, có backup nếu chưa nhận được
- Hiển thị ảnh chính (lớn) theo index đang chọn
- Nếu có >1 ảnh, hiển thị danh sách thumbnail dưới
- Click vào thumbnail thay đổi ảnh hiển thị chính

---

### 4️⃣ **Frontend: `src/frontend/src/components/OrderCard/style.scss`** ✅
**Thay đổi:** Thêm CSS cho carousel ảnh

**CSS mới:**
```scss
.product-image-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;

  .product-image-placeholder {
    width: 5rem;
    height: 5rem;
    background-color: #e5e7eb;
    border: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 0.75rem;
    cursor: pointer;
    transition: border-color 0.2s;

    &:hover {
      border-color: #d1d5db;
    }
  }

  .product-thumbnails {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    max-width: 5rem;

    .thumbnail {
      width: 2.5rem;
      height: 2.5rem;
      background-color: #e5e7eb;
      border: 2px solid #d1d5db;
      border-radius: 0.125rem;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.2s;

      &:hover {
        border-color: #9ca3af;
      }

      &.active {
        border-color: #ee4d2d;  // ← Màu cam Shopee
        box-shadow: 0 0 4px rgba(238, 77, 45, 0.3);
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
}
```

**Giải thích:**
- `.product-image-container`: Wrapper flexbox chiều dọc
- `.product-image-placeholder`: Ảnh chính (5rem x 5rem)
- `.product-thumbnails`: Danh sách thumbnail
- `.thumbnail`: Từng thumbnail (2.5rem x 2.5rem), có active state với border cam và shadow

---

## 🔄 Luồng Dữ Liệu

### Backend:
```
GET /orders/customer/get-status/{status}
    ↓
get_customer_orders() service
    ↓
SELECT Order + OrderItem + Product
    ↓
For each Product: SELECT Product_image → order them
    ↓
Return: [ResponseOrder with items[ResponseOrderItem(product_images=[...])]]
```

### Frontend:
```
Fetch orders from API
    ↓
OrderCard component receives order.items[0].product_images
    ↓
getProductImages() → productImages = [...images]
    ↓
Display main image + thumbnails
    ↓
User clicks thumbnail → setSelectedImageIndex(index)
    ↓
Main image updates
```

---

## 🧪 Cách Kiểm Tra

### Backend:
1. Chạy backend: `uvicorn src.backend.main:app --reload`
2. Call API: `GET /orders/customer/get-status/ALL`
3. Kiểm tra response JSON có field `product_images` với array of images

### Frontend:
1. Chạy frontend: `npm run dev`
2. Vào trang "Đơn Mua"
3. Xem order card - phải hiện:
   - Ảnh chính lớn (5rem x 5rem)
   - Danh sách thumbnail bên dưới (nếu có >1 ảnh)
4. Click vào thumbnail → ảnh chính thay đổi

---

## ✨ Tính Năng Mới

✅ Load toàn bộ ảnh sản phẩm từ DB (bảng `product_image`)
✅ Sắp xếp ảnh: ảnh chính đầu tiên, sau đó theo `display_order`
✅ Hiển thị carousel với thumbnail clickable
✅ Active state cho thumbnail đang chọn (border cam + shadow)
✅ Smooth transition khi click thumbnail
✅ Fallback gracefully nếu chưa có ảnh phụ

---

## 🛠️ Công Nghệ Sử Dụng

- **Backend**: SQLModel, FastAPI, SQLAlchemy ORM
- **Frontend**: React, SCSS (with flexbox, grid)
- **Database**: PostgreSQL (product_image table)

---

## 📌 Ghi Chú Thêm

- Code tương thích với cấu trúc hiện tại (không break change)
- Có fallback cho case chưa nhận được `product_images` từ API
- CSS responsive, support trên mobile (flex-wrap)
- Không cần thêm dependency nào, dùng vanilla React + CSS

---

**Hoàn thành ngày:** 26/03/2026
**Status:** ✅ Sẵn sàng kiểm tra
