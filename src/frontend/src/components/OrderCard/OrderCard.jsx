import React from 'react';
import './style.scss';

const OrderCard = ({ order }) => {
  return (
    <div className="order-card">
      
      {/* Header: Tên Shop & Trạng thái */}
      <div className="order-header">
        <div className="shop-info">
          {order.isFavorite && (
            <span className="badge-favorite">Yêu thích</span>
          )}
          <span className="shop-name">{order.shopName}</span>
          <button className="btn-chat">
            <span className="icon">💬</span> Chat
          </button>
          <button className="btn-view-shop">
            <span className="icon">🏪</span> View Shop
          </button>
        </div>
        <div className="order-status-info">
          {order.statusText && (
            <span className="delivery-status">
              <span className="icon">🚚</span> {order.statusText}
            </span>
          )}
          {order.statusText && <span className="divider">|</span>}
          <span className="order-status text-red">
            {order.status}
          </span>
        </div>
      </div>

      {/* Body: Thông tin Sản phẩm */}
      <div className="order-body">
        <div className="product-info-wrapper">
          <div className="product-image-placeholder">
            {/* Vị trí để thẻ <img> sau này */}
            Image
          </div>
          <div className="product-details">
            <h3 className="product-name">{order.productName}</h3>
            <p className="product-variation">Variation: {order.variation}</p>
            <p className="product-quantity">x{order.quantity}</p>
          </div>
        </div>
        <div className="product-pricing">
          {order.originalPrice && (
            <span className="original-price">
              {order.originalPrice.toLocaleString('vi-VN')}đ
            </span>
          )}
          <span className="current-price">
            {order.price.toLocaleString('vi-VN')}đ
          </span>
        </div>
      </div>

      {/* Footer: Tổng tiền & Nút Action */}
      <div className="order-footer">
        <div className="total-amount-wrapper">
          <span className="total-label">Order Total:</span>
          <span className="total-value">
            {order.totalAmount.toLocaleString('vi-VN')}đ
          </span>
        </div>
        <div className="action-buttons">
          {order.status === 'COMPLETED' ? (
             <button className="btn-primary">
               Buy Again
             </button>
          ) : (
             <button className="btn-primary">
               Re-order
             </button>
          )}
          <button className="btn-secondary">
            Contact Seller
          </button>
        </div>
      </div>

    </div>
  );
};

export default OrderCard;