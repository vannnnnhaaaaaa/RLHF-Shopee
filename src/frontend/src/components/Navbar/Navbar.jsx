import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import axios from 'axios';
import './style.scss';
import { FaFacebook, FaInstagram, FaRegUserCircle } from 'react-icons/fa';
// Đã xóa import IoMdNotificationsOutline ở đây vì nó đã được chuyển vào trong file NotificationDropdown.jsx
import { FiHelpCircle, FiSearch, FiShoppingCart } from 'react-icons/fi';
import { TbWorld } from 'react-icons/tb';
import { NotificationDropdown } from '../NotificationDropdown'; // Đảm bảo đường dẫn này đúng với project của bạn

function Navbar() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  // 1. Hàm lấy số lượng sản phẩm trong giỏ hàng
  const fetchCartCount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setCartCount(0);
      return;
    }

    try {
      const response = await axios.get('http://localhost:8000/cart/my-cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.status === 'success') {
        // Tính tổng số lượng (quantity) của tất cả sản phẩm trong các shop
        const totalItems = response.data.data.reduce((total, shop) => {
          return total + shop.items.reduce((sum, item) => sum + item.quantity, 0);
        }, 0);
        
        setCartCount(totalItems);
      }
    } catch (error) {
      console.error("Lỗi lấy số lượng giỏ hàng tại Navbar:", error);
      setCartCount(0);
    }
  };

  // Gọi hàm lấy số lượng khi component load
  useEffect(() => {
    fetchCartCount();
    
    // Lắng nghe sự kiện 'cartUpdated' để cập nhật badge ngay lập tức khi thêm hàng ở trang Detail
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
  }, []);

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        
        {/* === PHẦN TRÊN CÙNG (TOP NAV) === */}
        <nav className="navbar-top">
          <div className="top-left">
            {/* Chuyển tới kênh người bán */}
            <span className="nav-link" onClick={() => navigate('/seller-login')}>Kênh Người Bán</span>
            <span className="divider">|</span>
            <a href="#">Tải ứng dụng</a>
            <span className="divider">|</span>
            <div className="social-connect">
              Kết nối 
              <FaFacebook className="icon social-icon" /> 
              <FaInstagram className="icon social-icon" />
            </div>
          </div>

          <div className="top-right">
            
            {/* [ĐÃ THÊM]: COMPONENT THÔNG BÁO DROPDOWN Ở ĐÂY */}
            <NotificationDropdown />
            
            <div className="nav-item">
              <FiHelpCircle className="icon" /> Hỗ Trợ
            </div>
            <div className="nav-item">
              <TbWorld className="icon" /> Tiếng Việt
            </div>
            <div className="nav-item user-profile" onClick={()=>navigate ('/customer/account')}>
              <FaRegUserCircle className="icon" /> My Account
            </div>
          </div>
        </nav>

        {/* === PHẦN CHÍNH (MAIN NAV) === */}
        <div className="navbar-main">
          {/* Logo - Nhấn về trang chủ */}
          <div className="logo-section" onClick={() => navigate('/customer')} style={{cursor: 'pointer'}}>
            <div className="logo-icon-fake">S</div>
            <span className="logo-text">Shopee</span>
          </div>

          {/* Thanh Tìm Kiếm */}
          <div className="search-section">
            <div className="search-bar">
              <input type="text" placeholder="BỘ SƯU TẬP MỚI" />
              <button className="search-btn">
                <FiSearch />
              </button>
            </div>
            <div className="search-suggestions">
              <a href="#">Ip16 Thường</a>
              <a href="#">Bánh Oreo</a>
              <a href="#">IP 15 Thường</a>
            </div>
          </div>

          {/* Giỏ hàng - Nhấn để vào trang Cart */}
          <div className="cart-section" onClick={() => navigate('/customer/cartitem')} style={{cursor: 'pointer'}}>
            <div className="cart-icon-wrapper">
              <FiShoppingCart className="cart-icon" />
              {/* Chỉ hiện badge nếu có sản phẩm */}
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

export default Navbar;