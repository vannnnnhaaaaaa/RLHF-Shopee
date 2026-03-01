import React from 'react';
import './style.scss';

function ProductCard({ product }) {
  return (
    <div className="product-card">
      {/* Phần 1: Hình ảnh và các nhãn dán đè lên ảnh */}
      <div className="product-image-wrapper">
        <img src={product.image_link} alt={product.title} className="main-image" />
        
        {/* Badge giảm giá góc trên phải */}
        {product.discount && (
          <div className="discount-badge">
            <span className="percent">-{product.discount}%</span>
          </div>
        )}

        {/* Banner sale (Ví dụ: 3.3 VOUCHER XTRA) nằm dưới cùng của ảnh */}
        {product.hasSaleBanner && (
           <img 
             src="https://down-vn.img.susercontent.com/file/vn-50009109-8a38eccebb7bb8bc19dce6178df94e63" // Ảnh banner 3.3 giả định
             className="sale-banner" 
             alt="sale" 
           />
        )}
      </div>

      {/* Phần 2: Thông tin sản phẩm */}
      <div className="product-info">
        <div className="product-title">
          {product.isFavorite && <span className="favorite-label">Yêu thích</span>}
          {product.title}
        </div>

        <div className="product-tags">
          {product.tag && <span className="shop-tag">{product.tag}</span>}
        </div>

        <div className="product-footer">
          <div className="product-price">{product.price}₫</div>
          <div className="product-sold">{product.sold_count} đã bán</div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;