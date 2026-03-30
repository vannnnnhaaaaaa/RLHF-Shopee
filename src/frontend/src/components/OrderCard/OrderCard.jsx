import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.scss';
import purchase_customer_service from '../../services/purchase';

const OrderCard = ({ order, onUpdateSuccess }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
          {/* Chỉ hiển thị 1 ảnh đại diện duy nhất */}
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