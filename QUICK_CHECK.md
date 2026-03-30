# 🚀 HƯỚNG DẪN KIỂM TRA NHANH

## 📂 File Đã Sửa (4 file)

### 1. Backend Schema
📄 **File:** `src/backend/schemas.py`
- ✅ Thêm `ProductImageSchema` 
- ✅ Cập nhật `ResponseOrderItem` (thêm `product_images` list)

### 2. Backend Service  
📄 **File:** `src/backend/services/order_service.py`
- ✅ Import `Product_image` từ models
- ✅ Cập nhật `get_customer_orders()` function để JOIN với Product_image table
- ✅ Query tất cả ảnh sản phẩm và sắp xếp chúng

### 3. Frontend Component
📄 **File:** `src/frontend/src/components/OrderCard/OrderCard.jsx`
- ✅ Thêm state `selectedImageIndex` 
- ✅ Thêm function `getProductImages()`
- ✅ Render carousel: ảnh chính + danh sách thumbnail
- ✅ Thêm click handler cho thumbnail

### 4. Frontend Styling
📄 **File:** `src/frontend/src/components/OrderCard/style.scss`
- ✅ Thêm CSS cho `.product-image-container`
- ✅ Thêm CSS cho `.product-thumbnails` 
- ✅ Thêm CSS cho `.thumbnail` (active state, hover effects)

---

## ✅ Kiểm Tra Nhanh

### Backend - Test với Postman/curl:
```bash
# GET danh sách đơn hàng
GET http://localhost:8000/orders/customer/get-status/ALL

# Response phải chứa:
{
  "id": 1,
  "items": [{
    "id": 1,
    "product_id": 5,
    "product_name": "Laptop Dell",
    "product_category": "Điện tử",
    "product_image": "https://...",  // ảnh chính
    "product_images": [
      {
        "id": 1,
        "image_url": "https://...",
        "is_primary": true,
        "display_order": 0
      },
      {
        "id": 2,
        "image_url": "https://...",
        "is_primary": false,
        "display_order": 1
      }
    ],
    "quantity": 1,
    "price": 15000000
  }]
}
```

### Frontend - Test UI:
1. **Mở trang "Đơn Mua"** → Xem Order Card
2. **Ảnh chính**: Hiển thị ảnh sản phẩm (5rem x 5rem)
3. **Thumbnails**: Nếu có >1 ảnh, hiển thị danh sách thumbnail bên dưới
4. **Click thumbnail**: Ảnh chính thay đổi
5. **Active state**: Thumbnail được chọn có border cam (#ee4d2d) + shadow

---

## 🔧 Troubleshooting

### ❌ API vẫn không trả về `product_images`
- ✓ Restart backend server: Ctrl+C → `uvicorn src.backend.main:app --reload`
- ✓ Check database có product_image records không: 
  ```sql
  SELECT * FROM product_image WHERE product_id = <id>;
  ```

### ❌ Frontend không hiển thị thumbnails
- ✓ Open DevTools (F12) → Console, check có error không
- ✓ Kiểm tra network tab, response từ API có `product_images` không
- ✓ Check SCSS compiled correctly (rebuild CSS nếu cần)

### ❌ Thumbnail click không thay đổi ảnh
- ✓ Check browser console có react error không
- ✓ Verify state `selectedImageIndex` đang update (DevTools React extension)

---

## 📊 Dữ Liệu Mẫu

Nếu DB chưa có product_image records, tạo test data:

```sql
INSERT INTO product_image (product_id, image_url, is_primary, display_order) VALUES
(1, 'https://example.com/image1.jpg', true, 0),
(1, 'https://example.com/image2.jpg', false, 1),
(1, 'https://example.com/image3.jpg', false, 2);
```

---

## 🎯 Expected Behavior

### Trước (Lỗi):
- ❌ Order card chỉ show 1 ảnh (product_image từ Product table)
- ❌ Không thể xem ảnh khác

### Sau (Sửa):
- ✅ Order card show ảnh chính (5rem x 5rem)
- ✅ Hiển thị danh sách thumbnail (nếu có ảnh phụ)
- ✅ Click thumbnail → ảnh chính update
- ✅ Active thumbnail có visual feedback (border + shadow)

---

## 📝 Notes

- Tất cả thay đổi **backward-compatible** (không break old code)
- Có fallback nếu `product_images` từ API chưa sẵn sàng
- CSS responsive, support mobile
- Performance: Query Product_image được optimize (order by + limit trong loop)

---

**Mọi thắc mắc xem file `CHANGES_SUMMARY.md` để chi tiết từng thay đổi!**
