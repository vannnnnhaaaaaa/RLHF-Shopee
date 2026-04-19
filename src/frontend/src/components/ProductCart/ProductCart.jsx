import React from 'react';
import './style.scss';
import { Link } from 'react-router-dom';

function ProductCard({ product }) {
  const formatSoldCount = (count) => {
    if (!count) return 0;
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count;
  };

  const originalPrice = product.price || 0;
  const discountPercent = product.discount_percent || 0;
  const finalPrice = discountPercent > 0
    ? Math.round(originalPrice * (1 - discountPercent / 100))
    : originalPrice;

  return (
    <Link to={`/customer/product/${product.id}`} className="shopee-product-card">

      <div className="card-image-wrapper">
        <img src={product.image_link} alt={product.name} />

        {product.shop_badge && (
          <div className={`badge-shop ${product.shop_badge === 'Shopee Mall' ? 'mall' : 'favorite'}`}>
            {product.shop_badge}
          </div>
        )}

        {discountPercent > 0 && (
          <div className="badge-discount">
            <span className="percent">{discountPercent}%</span>
            <span className="label">GIẢM</span>
          </div>
        )}
      </div>

      <div className="card-info">
        <div className="product-name">{product.name}</div>

        <div className="tag-wrapper">
          {product.tag && <span className="product-tag">{product.tag}</span>}
        </div>

        <div className="card-footer">
          <div className="price">
            {discountPercent > 0 && (
              <span className="original-price">₫{originalPrice.toLocaleString('vi-VN')}</span>
            )}
            <span className="final-price">₫{finalPrice.toLocaleString('vi-VN')}</span>
          </div>
          <div className="sold-count">Đã bán {formatSoldCount(product.sold_count)}</div>
        </div>
      </div>

    </Link>
  );
}

export default ProductCard;
