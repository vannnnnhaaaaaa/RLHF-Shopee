# 💻 CODE COMPLETE - Đầy Đủ Tất Cả Thay Đổi

## 1️⃣ Backend Schema - `src/backend/schemas.py`

### ✏️ Thêm vào (sau line ~370 - phần Order):

```python
# --- SCHEMA CHO ẢNH SẢN PHẨM ---
class ProductImageSchema(SQLModel):
    id: int
    image_url: str
    is_primary: bool
    display_order: int
    
    class Config:
        from_attributes = True


# --- SCHEMAS CHO ĐẦU RA (RESPONSE) ---
class ResponseOrderItem(SQLModel):
    id: int
    product_id: int
    quantity: int
    price_at_purchase: float
    
    # Thêm thông tin sản phẩm
    product_name: str
    product_category: Optional[str] = None
    product_image: str  # ảnh chính (primary)
    product_images: list[ProductImageSchema] = []  # danh sách tất cả ảnh (bao gồm ảnh chính)
    
    class Config:
        from_attributes = True

class ResponseOrder(SQLModel):
    id: int
    customer_id: int
    total_price: float
    total_shipping: float
    status: str
    payment_method: str
    payment_status: str
    discount_product: float
    discount_shipping: float
    shopee_voucher_id: Optional[int]
    seller_voucher_id: Optional[int]
    created_at: datetime
    
    # Trả về kèm danh sách chi tiết đơn hàng
    items: list[ResponseOrderItem] = []
```

---

## 2️⃣ Backend Service - `src/backend/services/order_service.py`

### ✏️ Import (Line 1-5):
```python
from sqlmodel import select, Session, delete
# Cập nhật từ Bill/BillDetail sang Order/OrderItem
from src.backend.models import Order, OrderItem, Product, CartItem, Product_image  # ← Thêm Product_image
from src.backend.schemas import CreateOrder
from fastapi import HTTPException
from datetime import datetime 
```

### ✏️ Function `get_customer_orders()` - Thay thế toàn bộ:

```python
def get_customer_orders(status: str, current_id: int, session: Session, limit: int = 7, offset: int = 0):
    try:
        normalized_status = status.upper()

        # ==========================================
        # BƯỚC 1: LẤY DANH SÁCH ORDER (Có phân trang chuẩn)
        # ==========================================
        statement_order = select(Order).where(Order.customer_id == current_id)
        
        if normalized_status != 'ALL':
            statement_order = statement_order.where(Order.status == normalized_status)
        statement_order = statement_order.order_by(Order.created_at.desc())
        # Limit và Offset ở đây sẽ chuẩn xác là đếm số lượng Order
        statement_order = statement_order.limit(limit).offset(offset)
        orders = session.exec(statement_order).all()

        # Nếu không có order nào, ngưng luôn và trả về mảng rỗng
        if not orders:
            return []

        # ==========================================
        # BƯỚC 2: JOIN LẤY SẢN PHẨM TỪ ORDERITEM VÀ PRODUCT
        # ==========================================
        # Lấy danh sách các ID của Order vừa tìm được
        order_ids = [o.id for o in orders]

        # Query JOIN giữa OrderItem và Product
        statement_items = select(OrderItem, Product).join(
            Product, OrderItem.product_id == Product.id
        ).where(
            OrderItem.order_id.in_(order_ids) # Chỉ lấy item của những order đang hiển thị
        )
        
        # Kết quả trả về là list các tuple: [(OrderItem, Product), (OrderItem, Product)...]
        item_results = session.exec(statement_items).all()

        # ==========================================
        # BƯỚC 3: GOM NHÓM DỮ LIỆU THÀNH JSON CHO REACT
        # ==========================================
        # Tạo một dictionary để nhét items vào đúng order của nó
        order_dict = {
            order.id: {
                **order.model_dump(), # Lấy toàn bộ info của Order (total_price, status...)
                "items": []          # Tạo sẵn mảng rỗng để hứng sản phẩm
            }
            for order in orders
        }

        # Lặp qua kết quả JOIN để nhét sản phẩm vào mảng items tương ứng
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
                "product_images": product_images,      # Tất cả ảnh (bao gồm ảnh từ product_image table)
                "quantity": order_item.quantity,
                "price": order_item.price_at_purchase
            })

        # Trả về một mảng chứa các object hoàn chỉnh
        return list(order_dict.values())
        
    except Exception as e:
        raise Exception(f"Database Error: {e}")
```

---

## 3️⃣ Frontend Component - `src/frontend/src/components/OrderCard/OrderCard.jsx`

### ✏️ Thay thế toàn bộ file:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.scss';
import purchase_customer_service from '../../services/purchase';

const OrderCard = ({ order, onUpdateSuccess }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // ← State cho carousel ảnh
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!order) return null;

  const currentStatus = order.status?.toUpperCase() || '';

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleUpdateStatus = async (order_id, new_status) => {
    if (new_status === 'CANCELLED') {
      const isConfirmed = window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?");
      if (!isConfirmed) {
        return; 
      }
    }

    try {
      const response = await purchase_customer_service.updateOrderStatus(order_id, new_status);
      if (response) {
        onUpdateSuccess(order_id, new_status);
        if (new_status === 'CANCELLED') {
          alert("Đã hủy đơn hàng thành công!");
        }
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật đơn hàng:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại sau!');
    }
  };

  const handleRebuy = () => {
    if (!order || !order.items || order.items.length === 0) {
      console.warn('No items available for rebuy navigation');
      return;
    }
    
    const productId = order.items[0].product_id;
    if (productId) {
      navigate(`/customer/product/${productId}`);
    } else {
      console.warn('Product ID is not available for rebuy');
    }
  };

  // ← Hàm lấy danh sách ảnh từ sản phẩm
  const getProductImages = () => {
    if (!order?.items || order.items.length === 0) {
      return [];
    }
    
    const firstItem = order.items[0];
    if (firstItem.product_images && Array.isArray(firstItem.product_images)) {
      return firstItem.product_images;
    }
    
    if (firstItem.product_image) {
      return [{ image_url: firstItem.product_image, is_primary: true, display_order: 0 }];
    }
    
    return [];
  };

  const productImages = getProductImages();
  const currentImageUrl = productImages.length > 0 
    ? productImages[selectedImageIndex]?.image_url || order.items?.[0]?.product_image 
    : order.items?.[0]?.product_image;

  return (
    <div className="order-card">
      {/* Header */}
      <div className="order-header">
        <div className="shop-info">
          <span className="badge-favorite">Yêu thích</span>
          <span className="shop-name">Tên Shop (Đang cập nhật)</span>
          <button className="btn-chat">
            <span className="icon">💬</span> Chat
          </button>
          <button className="btn-view-shop">
            <span className="icon">🏪</span> Xem Shop
          </button>
        </div>

        <div className="order-status-info">
          <div className="delivery-status">
            <span className="icon">🚚</span> {order.payment_method}
          </div>
          <span className="divider">|</span>
          <div className="order-status text-red">
            {currentStatus}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="order-body">
        <div className="product-info-wrapper">
          {/* ← Carousel ảnh sản phẩm (MỚI) */}
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

          <div className="product-details">
            <h3 className="product-name">
              {order.items && order.items.length > 0 ? order.items[0].product_name : "Đang cập nhật"}
            </h3>
            <p className="product-variation">
              Phân loại: {order.items && order.items.length > 0 && order.items[0].product_category ? order.items[0].product_category : "Không có"}
            </p>
            <p className="product-quantity">
              x{order.items && order.items.length > 0 ? order.items[0].quantity : 1}
            </p>
          </div>
        </div>

        <div className="product-pricing">
          <span className="current-price">
            ₫{order.total_price?.toLocaleString('vi-VN')}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="order-footer">
        <div className="total-amount-wrapper">
          <span className="total-label">Thành tiền:</span>
          <span className="total-value">
            ₫{order.total_price?.toLocaleString('vi-VN')}
          </span>
        </div>

        <div className="action-buttons">
          {(currentStatus === 'PENDING' || currentStatus === 'ACCEPT') && (
            <>
              <button className="btn-secondary">Liên hệ người bán</button>
              <button 
                className="btn-primary btn-cancel" 
                onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
              >
                Hủy đơn hàng
              </button>
            </>
          )}

          {currentStatus === 'DELIVERING' && (
            <>
              <button className="btn-secondary">Liên hệ người bán</button>
              <button 
                className="btn-primary btn-received"
                onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
              >
                Đã nhận được hàng
              </button>
            </>
          )}

          {currentStatus === 'COMPLETED' && (
            <>
              <button className="btn-primary btn-rate">Đánh giá</button>
              {order.can_return && (
                <button className="btn-secondary">Yêu cầu Trả hàng/Hoàn tiền</button>
              )}
              <div className="dropdown-container" ref={dropdownRef}>
                <button
                  className="btn-secondary btn-more"
                  onClick={handleDropdownToggle}
                >
                  Thêm
                  <span className={`chevron ${isDropdownOpen ? 'up' : 'down'}`}>▼</span>
                </button>
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    <button className="dropdown-item" onClick={handleRebuy}>Mua lại</button>
                    <button className="dropdown-item">Liên hệ người bán</button>
                  </div>
                )}
              </div>
            </>
          )}

          {currentStatus === 'CANCELLED' && (
            <>
              <button className="btn-secondary">Chi tiết hủy đơn</button>
              <button className="btn-primary btn-rebuy" onClick={handleRebuy}>Mua lại</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
```

---

## 4️⃣ Frontend Styling - `src/frontend/src/components/OrderCard/style.scss`

### ✏️ Thay thế `.product-info-wrapper` section:

```scss
    .product-info-wrapper {
      display: flex;
      gap: 0.75rem;

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
              border-color: #ee4d2d;  // Màu cam Shopee
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

      .product-details {
        .product-name {
          font-size: 0.875rem;
          color: #1f2937;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-variation {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0.25rem 0 0 0;
        }

        .product-quantity {
          font-size: 0.875rem;
          color: #1f2937;
          margin: 0.25rem 0 0 0;
        }
      }
    }
```

---

## 🎉 Xong! 

Tất cả code đã được cung cấp đầy đủ. Bạn có thể:

1. **Copy-paste** từng phần vào file tương ứng
2. **Restart** backend + frontend
3. **Test** theo hướng dẫn trong `QUICK_CHECK.md`

**Good luck! 🚀**
