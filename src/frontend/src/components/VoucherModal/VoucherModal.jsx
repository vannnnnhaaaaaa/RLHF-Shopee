// VoucherModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './style.scss'; // Dùng chung file style hoặc tạo file riêng cho Modal

function VoucherModal({ shopId, shopName, isOpen, onClose, onApplyVoucher }) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Chỉ gọi API khi Modal được mở
    if (isOpen) {
      const fetchVouchers = async () => {
        setLoading(true);
        try {
          // Bạn thay đường link này bằng API lấy voucher theo shop của bạn
          // Ví dụ API: /seller/vouchers/list?seller_id=123 (nếu API public)
          // Hoặc bạn phải viết một API public riêng: /public/vouchers?shop_id={shopId}
          const response = await axios.get(`http://localhost:8000/public/vouchers?shop_id=${shopId}`);
          
          if (response.data.status === 'success') {
            setVouchers(response.data.data);
          }
        } catch (error) {
          console.error("Lỗi lấy danh sách voucher:", error);
          setVouchers([]);
        } finally {
          setLoading(false);
        }
      };
      fetchVouchers();
    }
  }, [isOpen, shopId]);

  if (!isOpen) return null; // Nếu không mở thì không render gì cả

  return (
    <div className="voucher-modal-overlay" onClick={onClose}>
      <div className="voucher-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Voucher của Shop: {shopName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p className="loading-text">Đang tải voucher...</p>
          ) : vouchers.length === 0 ? (
            <p className="empty-text">Shop này chưa có voucher nào.</p>
          ) : (
            <div className="voucher-list">
              {vouchers.map(v => (
                <div key={v.id} className="voucher-item">
                  <div className="voucher-info">
                    <p className="voucher-code">{v.code}</p>
                    <p className="voucher-desc">
                      Giảm {v.discount_type === 'percent' ? `${v.discount_value}%` : `₫${v.discount_value.toLocaleString()}`}
                    </p>
                    <p className="voucher-condition">
                      Đơn tối thiểu ₫{v.min_spend.toLocaleString()}
                    </p>
                  </div>
                  <button 
                    className="apply-btn"
                    onClick={() => {
                      onApplyVoucher(v);
                      onClose(); // Áp dụng xong thì đóng modal
                    }}
                  >
                    Dùng ngay
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VoucherModal;