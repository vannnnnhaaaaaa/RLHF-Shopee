import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './style.scss';

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Nhận state từ trang Cart truyền sang (fallback để xử lý direct navigation)
  const { selectedCartIds, appliedVouchers } = location.state || { selectedCartIds: [], appliedVouchers: {} };

  // 1. GỌI API PREVIEW (TÍNH TOÁN GIÁ TIỀN & PHÍ SHIP)
  useEffect(() => {
    // Nếu ai đó gõ trực tiếp URL /checkout mà không có cart_ids, đá về giỏ hàng
    if (!selectedCartIds || selectedCartIds.length === 0) {
      navigate('/customer/cartitem');
      return;
    }

    const fetchCheckoutPreview = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return navigate('/login');

      try {
        const response = await axios.post(
          'http://localhost:8000/orders/checkout/preview',
          { cart_ids: selectedCartIds, applied_vouchers: appliedVouchers || {} },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(response.data)
        if (response.data.status === 'success') {
          setPreviewData(response.data.data);
        }
      } catch (error) {
        console.error("Lỗi tính toán Checkout:", error);
        alert(error.response?.data?.detail || "Không thể tải thông tin thanh toán.");
        navigate('/customer/cartitem');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutPreview();
  }, [selectedCartIds, navigate]);

  // 2. XỬ LÝ ĐẶT HÀNG (GỌI API TẠO BILL THỰC SỰ)
  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    const token = localStorage.getItem('access_token');

    try {
      // Bóc tách danh sách sản phẩm từ cục dữ liệu preview
      const billDetails = previewData.checkout_data.flatMap(shop => shop.items).map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price
      }));

      // Thu thập seller_voucher_id từ các shop đã áp voucher (nếu có)
      const appliedSellerVoucherIds = previewData.checkout_data
        .filter(shop => shop.voucher_discount && shop.voucher_discount > 0)
        .map(shop => shop.seller_voucher_id)
        .filter(Boolean);

      // Payload gửi lên API — voucher đã được tính phía backend
      const payload = {
        total_price: previewData.merchandise_subtotal,
        total_shipping: previewData.shipping_subtotal,
        payment_method: "COD",
        payment_status: "pending",
        discount_product: previewData.voucher_discount || 0.0,
        discount_shipping: 0.0,
        shopee_voucher_id: null,
        seller_voucher_ids: appliedSellerVoucherIds,
        details: billDetails
      };

      const response = await axios.post(
        'http://localhost:8000/orders/checkout',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        alert("🎉 Đặt hàng thành công!");
        navigate('/customer');
        window.dispatchEvent(new Event('cartUpdated'));
        window.dispatchEvent(new Event('updateNotifications'));
      }
    } catch (error) {
      console.error("Lỗi đặt hàng:", error);
      alert(error.response?.data?.detail || "Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại!");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. HIỂN THỊ GIAO DIỆN KHI ĐANG LOAD VÀ SAU KHI LOAD XONG
  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Đang tính toán chi phí...</div>;
  if (!previewData) return null;

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        
        {/* KHỐI 1: ĐỊA CHỈ NHẬN HÀNG */}
        <div className="checkout-section address-section">
          <div className="address-stripe"></div>
          <div className="section-header">
            <i className="fas fa-map-marker-alt location-icon"></i>
            <h2>Địa Chỉ Nhận Hàng</h2>
          </div>
          <div className="address-content">
            <div className="user-info">
              <span className="name">{previewData.customer?.name || 'Khách Hàng Shopee'}</span>
              <span className="phone">{previewData.customer?.number ? `(+84) ${previewData.customer.number.replace(/^0/, '')}` : ''}</span>
            </div>
            <div className="address-detail">
              {[
                previewData.customer?.address_detail,
                previewData.customer?.note
              ].filter(Boolean).join(' · ')}
            </div>
            <div className="address-meta">
              {previewData.customer?.map_district && <span>{previewData.customer.map_district}</span>}
              {previewData.customer?.map_city && <span>, {previewData.customer.map_city}</span>}
            </div>
            <div className="default-badge">Mặc định</div>
            <button className="change-address-btn">THAY ĐỔI</button>
          </div>
        </div>

        {/* KHỐI 2: DANH SÁCH SẢN PHẨM & PHÍ SHIP TỪNG SHOP */}
        <div className="checkout-section products-section">
          <div className="products-header">
            <div className="col-name">Sản phẩm</div>
            <div className="col-price">Đơn giá</div>
            <div className="col-qty">Số lượng</div>
            <div className="col-subtotal">Thành tiền</div>
          </div>

          {/* Map dữ liệu từ previewData.checkout_data mà Backend trả về */}
          {previewData.checkout_data.map((shop) => (
            <div key={shop.shop_id} className="shop-group">
              <div className="shop-header">
                <span className="shop-badge">{shop.shop_badge}</span>
                <span className="shop-name">{shop.shop_name}</span>
              </div>
              
              {shop.items.map(item => (
                <div key={item.cart_id} className="item-row">
                  <div className="col-name">
                    <img src={item.image} alt={item.name} />
                    <div className="item-info">
                      <p className="item-title">{item.name}</p>
                      <p className="item-variant">Loại: {item.variant}</p>
                    </div>
                  </div>
                  <div className="col-price">₫{item.price.toLocaleString('vi-VN')}</div>
                  <div className="col-qty">{item.quantity}</div>
                  <div className="col-subtotal">₫{(item.price * item.quantity).toLocaleString('vi-VN')}</div>
                </div>
              ))}

              <div className="shop-footer">
                <div className="shipping-method">
                  <span className="label">Đơn vị vận chuyển:</span>
                  <div className="shipping-info">
                    <strong>Giao Hàng Tiêu Chuẩn</strong>
                    <p>Nhận hàng trong 2-3 ngày tới</p>
                    {shop.distance_km > 0 && (
                      <p style={{ color: '#888', fontSize: '12px' }}>
                        📍 Cách {shop.distance_km} km
                      </p>
                    )}
                  </div>
                  <button className="change-btn">Thay đổi</button>
                  {/* Tiền ship lấy thẳng từ Backend trả về cho Shop này */}
                  <span className="shipping-cost">₫{shop.shipping_fee.toLocaleString('vi-VN')}</span>
                </div>
                {shop.voucher_discount > 0 && (
                  <div className="voucher-discount-row" style={{ textAlign: 'right', color: '#ee4d2d', fontSize: '13px', paddingTop: '4px' }}>
                    🎫 Giảm ₫{shop.voucher_discount.toLocaleString('vi-VN')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* KHỐI 3: THANH TOÁN VÀ CHỐT ĐƠN */}
        <div className="checkout-section payment-summary-section">
          <div className="payment-method-row">
            <div className="label">Phương thức thanh toán</div>
            <div className="value">Thanh toán khi nhận hàng (COD)</div>
            <button className="change-btn">THAY ĐỔI</button>
          </div>

          <div className="summary-details">
            <div className="summary-row">
              <span>Tổng tiền hàng</span>
              {/* Tiền hàng tổng cộng từ Backend */}
              <span>₫{previewData.merchandise_subtotal.toLocaleString('vi-VN')}</span>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              {/* Tiền ship tổng cộng từ Backend */}
              <span>₫{previewData.shipping_subtotal.toLocaleString('vi-VN')}</span>
            </div>
            {previewData.voucher_discount > 0 && (
              <div className="summary-row" style={{ color: '#ee4d2d' }}>
                <span>Giảm voucher</span>
                <span>-₫{previewData.voucher_discount.toLocaleString('vi-VN')}</span>
              </div>
            )}
            <div className="summary-row total-row">
              <span>Tổng thanh toán:</span>
              {/* Tiền khách phải trả từ Backend */}
              <span className="total-amount">₫{previewData.total_payment.toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div className="place-order-row">
            <div className="terms">
              Nhấn "Đặt hàng" đồng nghĩa với việc bạn đồng ý tuân theo <a href="#">Điều khoản Shopee</a>
            </div>
            <button 
              className="btn-place-order" 
              disabled={isProcessing} 
              onClick={handlePlaceOrder}
            >
              {isProcessing ? 'Đang xử lý...' : 'Đặt hàng'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Checkout;