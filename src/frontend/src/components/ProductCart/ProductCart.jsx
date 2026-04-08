import React from 'react';
import './style.scss';
import { Link } from 'react-router-dom';
function ProductCard({ product }) {
  // Hàm format lượt bán (VD: 12500 -> 12.5k)
  const formatSoldCount = (count) => {
    if (!count) return 0;
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count;
  };

  return (
    <Link to={`/customer/product/${product.id}`} className="shopee-product-card">
    <div className="shopee-product-card">
      
      <div className="card-image-wrapper">
        <img src={product.image_link} alt={product.name} />
        
        {/* Nhãn Shopee Mall hoặc Yêu thích */}
        {product.shop_badge && (
          <div className={`badge-shop ${product.shop_badge === 'Shopee Mall' ? 'mall' : 'favorite'}`}>
            {product.shop_badge}
          </div>
        )}

        {/* Nhãn giảm giá màu vàng góc phải */}
        {product.discount_percent > 0 && (
          <div className="badge-discount">
            <span className="percent">{product.discount_percent}%</span>
            <span className="label">GIẢM</span>
          </div>
        )}
      </div>

      <div className="card-info">
        {/* Tên sản phẩm giới hạn 2 dòng */}
        <div className="product-name">{product.name}</div>
        
        {/* Tag nổi bật (Khung đỏ) */}
        <div className="tag-wrapper">
          {product.tag && <span className="product-tag">{product.tag}</span>}
        </div>

        <div className="card-footer">
          <div className="price">
            <span className="currency">₫</span>
            {product.price.toLocaleString('vi-VN')}
          </div>
          <div className="sold-count">Đã bán {formatSoldCount(product.sold_count)}</div>
        </div>
      </div>
    </div>
      </Link>
  );
}

export default ProductCard;
