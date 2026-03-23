import React from 'react';
import './style.scss';

const OrderCard = ({ order }) => {
  if (!order) return null;

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
            {order.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="order-body">
        {/* Lấy sản phẩm đầu tiên trong mảng items để hiển thị đại diện */}
        <div className="product-info-wrapper">
          <div className="product-image-placeholder">
            {order.items && order.items.length > 0 ? (
              <img
                src={order.items[0].product_image}
                alt="Product"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : "Ảnh"}
          </div>
          <div className="product-details">
            <h3 className="product-name">
              {order.items && order.items.length > 0 ? order.items[0].product_name : "Đang cập nhật"}
            </h3>

            {/* ĐÃ CẬP NHẬT: Hiển thị Category ở đây */}
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
          <button className="btn-secondary">Liên hệ người bán</button>
          <button className="btn-primary">Mua lại</button>
        </div>
      </div>

    </div>
  );
};

export default OrderCard;