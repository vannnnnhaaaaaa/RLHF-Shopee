import React, { useEffect, useState } from 'react';
import axios from 'axios'; // BẮT BUỘC IMPORT AXIOS
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import ShopGroup from '../../../components/ShopGroup'; 
import './style.scss';

function Cart() {
  const [cartData, setCartData] = useState([]); 
  const [selectedIds, setSelectedIds] = useState([]); // Sửa lại tên biến cho chuẩn: chứa mảng ID
  const [loading, setLoading] = useState(true);

  // 1. GỌI API KHI MỞ TRANG
  useEffect(() => {
    const fetchMyCart = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert("Vui lòng đăng nhập!");
        window.location.href = '/login';
        return;
      }

      try {
        const response = await axios.get('http://localhost:8000/cart/my-cart', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.status === 'success') {
          setCartData(response.data.data); 
        }
      } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyCart();
  }, []);

  // 2. TÍNH TOÁN DỮ LIỆU TỰ ĐỘNG (Phần này bạn bị thiếu)
  // Lấy ra tất cả cart_id có trong giỏ hàng
  const allCartIds = cartData.flatMap(shop => shop.items).map(i => i.cart_id);
  
  // Kiểm tra xem số lượng tick chọn có bằng tổng số lượng trong giỏ không
  const isAllSelected = allCartIds.length > 0 && selectedIds.length === allCartIds.length;
  
  // Tính tổng tiền những món được tick chọn
  const totalAmount = cartData.flatMap(shop => shop.items)
    .filter(item => selectedIds.includes(item.cart_id))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);


  // 3. CÁC HÀM XỬ LÝ SỰ KIỆN
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

  const handleQuantityChange = (shopId, cartId, type) => {
    const newData = cartData.map(shop => {
      if (shop.shop_id !== shopId) return shop;
      return {
        ...shop,
        items: shop.items.map(item => {
          if (item.cart_id === cartId) {
            let newQty = item.quantity;
            if (type === 'increase' && newQty < item.stock) newQty++;
            if (type === 'decrease' && newQty > 1) newQty--;
            return { ...item, quantity: newQty };
          }
          return item;
        })
      };
    });
    setCartData(newData);
    // Sau này bạn có thể gọi API updateQuantity lên Backend ở vị trí này
  };

  const handleRemove = (cartId) => {
    alert(`Đã xóa sản phẩm ID: ${cartId}`);
    // Tạm thời ẩn sản phẩm trên UI sau khi bấm xóa
    const newData = cartData.map(shop => ({
      ...shop,
      items: shop.items.filter(item => item.cart_id !== cartId)
    })).filter(shop => shop.items.length > 0); // Nếu shop không còn món nào thì xóa luôn shop
    setCartData(newData);
  };

  // 4. HIỂN THỊ GIAO DIỆN
  if (loading) return <div style={{textAlign: 'center', marginTop: '100px'}}>Đang tải giỏ hàng...</div>;

  return (
    <div className="cart-page-container">
      <Navbar />

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

        {/* Gọi Component ShopGroup ra và truyền dữ liệu */}
        {cartData.length === 0 ? (
          <div style={{textAlign: 'center', padding: '50px', background: 'white'}}>Giỏ hàng của bạn đang trống.</div>
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
            />
          ))
        )}

        {/* Thanh thanh toán dưới cùng */}
        <div className="cart-sticky-bottom">
          <div className="checkout-row">
            <div className="left-actions">
              <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />
              <button className="action-btn" onClick={handleSelectAll}>Chọn Tất Cả</button>
              <button className="action-btn" onClick={() => alert("Xóa các mục đã chọn")}>Xóa</button>
            </div>
            
            <div className="right-checkout">
              <div className="total-summary">
                <span className="label">Tổng cộng ({selectedIds.length} sản phẩm):</span>
                <span className="total-price">{totalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
              <button className="btn-buy" disabled={selectedIds.length === 0}>
                Mua Hàng
              </button>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
}

export default Cart;