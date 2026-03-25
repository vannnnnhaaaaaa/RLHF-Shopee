import React, { useState, useRef, useEffect } from 'react';
import './style.scss';

const OrderCard = ({ order }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  if (!order) return null;

  // Chuẩn hóa chuỗi trạng thái thành chữ in hoa để so sánh cho an toàn
  const currentStatus = order.status?.toUpperCase() || '';

  // Hàm đóng dropdown khi click bên ngoài
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

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

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
          {/* PENDING hoặc ACCEPT */}
          {(currentStatus === 'PENDING' || currentStatus === 'ACCEPT') && (
            <>
              <button className="btn-secondary">Liên hệ người bán</button>
              <button className="btn-primary btn-cancel">Hủy đơn hàng</button>
            </>
          )}

          {/* DELIVERING */}
          {currentStatus === 'DELIVERING' && (
            <>
              <button className="btn-secondary">Liên hệ người bán</button>
              <button className="btn-primary btn-received">Đã nhận được hàng</button>
            </>
          )}

          {/* COMPLETED */}
          {currentStatus === 'COMPLETED' && (
            <>
              {order.can_rate && (
                <button className="btn-primary btn-rate">Đánh giá</button>
              )}
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
                    <button className="dropdown-item">Mua lại</button>
                    <button className="dropdown-item">Liên hệ người bán</button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* CANCELLED */}
          {currentStatus === 'CANCELLED' && (
            <>
              <button className="btn-secondary">Chi tiết hủy đơn</button>
              <button className="btn-primary btn-rebuy">Mua lại</button>
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default OrderCard;