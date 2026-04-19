import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.scss';
import purchase_customer_service from '../../services/purchase';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

const OrderCard = ({ order, onUpdateSuccess }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  console.log(order)
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
    // Tạm thời điều hướng về sản phẩm đầu tiên để mua lại
    const productId = order.items[0].product_id;
    if (productId) {
      navigate(`/customer/product/${productId}`);
    }
  };

  return (
    <div className="order-card">
      {/* Header */}
      <div className="order-header">
        <div className="shop-info">
          <span className="badge-favorite">Yêu thích</span>
          <span className="shop-name">Mã Đơn: #{order.id}</span>
          <span className="order-time">
            <span className="icon">🕒</span> {formatDate(order.created_at)}
          </span>
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


      {/* Body: DÙNG VÒNG LẶP .MAP() ĐỂ HIỂN THỊ TẤT CẢ SẢN PHẨM */}
      <div className="order-body">
        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => (
            <div key={index} className="order-item-row">

              <div className="product-info-wrapper">
                <div className="product-image-placeholder">
                  <img
                    src={item.product_image || item.image_link}
                    alt={item.product_name}
                  />
                </div>

                <div className="product-details">
                  <h3 className="product-name">
                    {item.product_name}
                  </h3>
                  <p className="product-variation">
                    Phân loại: {item.product_category || "Mặc định"}
                  </p>
                  <p className="product-quantity">
                    x{item.quantity}
                  </p>
                </div>
              </div>

              {/* GIÁ CỦA TỪNG SẢN PHẨM */}
              <div className="product-pricing">
                <span className="current-price" style={{ color: '#ee4d2d', fontWeight: '500' }}>
                  {/* Dùng toLocaleString('vi-VN') để tạo dấu chấm phân cách hàng nghìn */}
                  ₫{item.price_at_purchase ? item.price_at_purchase.toLocaleString('vi-VN') : '0'}
                </span>
              </div>

            </div>
          ))
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Không có dữ liệu sản phẩm</div>
        )}
      </div>

      {/* Footer: TỔNG TIỀN CẢ ĐƠN NẰM Ở ĐÂY CHỨ KHÔNG NẰM Ở BODY */}
      <div className="order-footer">
        <div className="total-amount-wrapper">
          <span className="total-label">Thành tiền:</span>
          <span className="total-value" style={{ color: '#ee4d2d', fontSize: '20px', fontWeight: '500' }}>
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