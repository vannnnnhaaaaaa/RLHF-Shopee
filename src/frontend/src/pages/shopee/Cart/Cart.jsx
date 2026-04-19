import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import ShopGroup from '../../../components/ShopGroup';
import { calculateShopDiscount } from '../../../services/product';
import './style.scss';

function Cart() {
  const location = useLocation();
  const navigate = useNavigate();

  const [cartData, setCartData] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [appliedVouchers, setAppliedVouchers] = useState({}); // { [shopId]: voucher }
  const [loading, setLoading] = useState(true);

  // 1. TẢI DỮ LIỆU GIỎ HÀNG
  useEffect(() => {
    const fetchMyCart = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert("Vui lòng đăng nhập!");
        navigate('/login'); // Dùng navigate thay vì window.location.href cho chuẩn React
        return;
      }

      try {
        const response = await axios.get('http://localhost:8000/cart/my-cart', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.status === 'success') {
          const rawData = response.data.data;

          // Tiền xử lý dữ liệu: Tính toán giá gốc và giá đã giảm
          const formattedData = rawData.map(shop => ({
            ...shop,
            items: shop.items.map(item => {
              const originalPrice = item.price || 0;
              const discountPercent = item.discount_percent || 0;

              // Tính giá màu đỏ cuối cùng
              const finalPrice = discountPercent > 0
                ? Math.round(originalPrice * (1 - discountPercent / 100))
                : originalPrice;

              return {
                ...item,
                original_price: originalPrice,
                price: finalPrice
              };
            })
          }));

          setCartData(formattedData);

          // Xử lý Auto-Select nếu chuyển từ trang Detail sang bằng nút "Mua Ngay"
          if (location.state?.autoSelectProductId) {
            const itemsToSelect = [];
            formattedData.forEach(shop => {
              shop.items.forEach(item => {
                if (item.product_id === location.state.autoSelectProductId) {
                  itemsToSelect.push(item.cart_id);
                }
              });
            });

            if (itemsToSelect.length > 0) {
              setSelectedIds(itemsToSelect);
            }
          }
        }
      } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyCart();
  }, [location.state, navigate]);


  
  // 2. CHUYỂN HƯỚNG SANG TRANG CHECKOUT 
  const handleCheckout = async () => {
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!");
      return;
    }

    // Phải gọi token ra vì hàm này nằm ngoài useEffect
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert("Vui lòng đăng nhập!");
      return navigate('/login');
    }

    try {
      // BẮT BUỘC phải có chữ 'await' để đợi Backend tính toán xong trả về
      const response = await axios.get('http://localhost:8000/customer/check-profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Kiểm tra data từ Backend trả về
      if (response.data === true) {
        // Thông tin đã đầy đủ -> Đá sang trang Checkout mang theo mảng ID
        navigate('/customer/checkout', {
          state: { selectedCartIds: selectedIds }
        });
      } else {
        // Thông tin bị thiếu -> Nhắc nhở và đá sang trang Profile
        alert("Bạn cần bổ sung đầy đủ thông tin giao hàng (Địa chỉ, Số điện thoại...) trước khi thanh toán!");
        navigate('/customer/account');
      }

    } catch (error) {
      console.error("Lỗi kiểm tra profile:", error);
      alert("Có lỗi xảy ra khi kiểm tra thông tin. Vui lòng thử lại!");
    }
  };

  // 3. CÁC HÀM XỬ LÝ LOGIC UI (Tính tổng, Tick chọn, Tăng giảm SL, Xóa)

  const allCartIds = cartData.flatMap(shop => shop.items).map(i => i.cart_id);
  const isAllSelected = allCartIds.length > 0 && selectedIds.length === allCartIds.length;

  // Tổng tiền sản phẩm đã tick
  const productTotal = cartData.flatMap(shop => shop.items)
    .filter(item => selectedIds.includes(item.cart_id))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Tổng tiền giảm từ voucher (tất cả shop)
  const totalVoucherDiscount = cartData.reduce((totalDiscount, shop) => {
    const voucher = appliedVouchers[shop.shop_id];
    if (!voucher) return totalDiscount;
    return totalDiscount + calculateShopDiscount(shop.items, selectedIds, voucher);
  }, 0);

  const totalAmount = Math.max(0, productTotal - totalVoucherDiscount);

  const handleSelectAll = () => {
    setSelectedIds(isAllSelected ? [] : allCartIds);
  };

  const handleSelectShop = (shopId) => {
    const shop = cartData.find(s => s.shop_id === shopId);
    const shopItemIds = shop.items.map(i => i.cart_id);
    const isShopAllSelected = shopItemIds.every(id => selectedIds.includes(id));

    if (isShopAllSelected) {
      setSelectedIds(selectedIds.filter(id => !shopItemIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...shopItemIds])));
    }
  };

  const handleSelectItem = (cartId) => {
    if (selectedIds.includes(cartId)) {
      setSelectedIds(selectedIds.filter(id => id !== cartId));
    } else {
      setSelectedIds([...selectedIds, cartId]);
    }
  };

  const handleQuantityChange = async (shopId, cartId, type) => {
    const token = localStorage.getItem('access_token');
    const currentShop = cartData.find(s => s.shop_id === shopId);
    const currentItem = currentShop?.items.find(i => i.cart_id === cartId);

    if (type === 'decrease' && currentItem?.quantity <= 1) return;

    try {
      const endpoint = type === 'increase' ? 'increaseitem' : 'decrease';
      const response = await axios.patch(`http://localhost:8000/cart/${endpoint}/${cartId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        window.dispatchEvent(new Event('cartUpdated'));
        const newData = cartData.map(shop => {
          if (shop.shop_id !== shopId) return shop;
          return {
            ...shop,
            items: shop.items.map(item => {
              if (item.cart_id === cartId) {
                return { ...item, quantity: type === 'increase' ? item.quantity + 1 : item.quantity - 1 };
              }
              return item;
            })
          };
        });
        setCartData(newData);
      }
    } catch (error) {
      console.error("Lỗi cập nhật số lượng:", error);
      alert(error.response?.data?.detail || "Không thể cập nhật số lượng");
    }
  };

  const handleRemove = async (cartId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

    const token = localStorage.getItem('access_token');
    try {
      await axios.delete(`http://localhost:8000/cart/remove/${cartId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newData = cartData.map(shop => ({
        ...shop,
        items: shop.items.filter(item => item.cart_id !== cartId)
      })).filter(shop => shop.items.length > 0);
      window.dispatchEvent(new Event('cartUpdated'));
      setCartData(newData);
      setSelectedIds(selectedIds.filter(id => id !== cartId));

    } catch (error) {
      console.error("Lỗi xóa sản phẩm:", error);
      alert("Không thể xóa sản phẩm này");
    }
  };

  const handleApplyVoucher = (shopId, voucher) => {
    setAppliedVouchers(prev => ({ ...prev, [shopId]: voucher }));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn sản phẩm để xóa!");
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} mục đã chọn?`)) {
      return;
    }

    const token = localStorage.getItem('access_token');

    try {
      const response = await axios.post(
        'http://localhost:8000/cart/remove-multiple',
        selectedIds,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        const newData = cartData.map(shop => ({
          ...shop,
          items: shop.items.filter(item => !selectedIds.includes(item.cart_id))
        })).filter(shop => shop.items.length > 0);

        setCartData(newData);
        setSelectedIds([]);
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Lỗi xóa hàng loạt:", error);
      alert("Không thể xóa các mục đã chọn. Vui lòng thử lại.");
    }
  };


  // 4. HIỂN THỊ GIAO DIỆN
  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Đang tải giỏ hàng...</div>;

  return (
    <div className="cart-page-container">
      <div className="cart-main-content">

        {/* Header Bảng */}
        <div className="cart-header-row">
          <div className="col-checkbox"><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} /></div>
          <div className="col-product">Sản Phẩm</div>
          <div className="col-price">Đơn Giá</div>
          <div className="col-quantity">Số Lượng</div>
          <div className="col-total">Số Tiền</div>
          <div className="col-actions">Thao Tác</div>
        </div>

        {/* Danh sách Shop và Sản phẩm */}
        {cartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', background: 'white' }}>Giỏ hàng của bạn đang trống.</div>
        ) : (
          cartData.map((shop) => (
            <ShopGroup
              key={shop.shop_id}
              shop={shop}
              selectedIds={selectedIds}
              onToggleShop={handleSelectShop}
              onToggleItem={handleSelectItem}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
              appliedVoucher={appliedVouchers[shop.shop_id]}
              onApplyVoucher={handleApplyVoucher}
            />
          ))
        )}

        {/* Thanh thanh toán dưới cùng */}
        <div className="cart-sticky-bottom">
          <div className="checkout-row">
            <div className="left-actions">
              <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />
              <button className="action-btn" onClick={handleSelectAll}>Chọn Tất Cả</button>
              <button className="action-btn" onClick={handleDeleteSelected}>Xóa</button>
            </div>

            <div className="right-checkout">
              <div className="total-summary">
                <span className="label">Tổng cộng ({selectedIds.length} sản phẩm):</span>
                <span className="total-price">{totalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
              <button
                className="btn-buy"
                disabled={selectedIds.length === 0}
                onClick={handleCheckout}
              >
                Mua Hàng
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Cart;