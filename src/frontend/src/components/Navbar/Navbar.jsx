import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Dùng Link và useNavigate để chuyển trang
import axios from 'axios';
import './style.scss';
import { FaFacebook, FaInstagram, FaRegUserCircle } from 'react-icons/fa';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { FiHelpCircle, FiSearch, FiShoppingCart } from 'react-icons/fi';
import { TbWorld } from 'react-icons/tb';

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
            <div className="nav-item">
              <IoMdNotificationsOutline className="icon" /> Thông Báo
            </div>
            <div className="nav-item">
              <FiHelpCircle className="icon" /> Hỗ Trợ
            </div>
            <div className="nav-item">
              <TbWorld className="icon" /> Tiếng Việt
            </div>
            <div className="nav-item user-profile">
              <FaRegUserCircle className="icon" /> phungvanha1
            </div>
          </div>
        </nav>

        {/* === PHẦN CHÍNH (MAIN NAV) === */}
        <div className="navbar-main">
          {/* Logo - Nhấn về trang chủ */}
          <div className="logo-section" onClick={() => navigate('/customer/home')} style={{cursor: 'pointer'}}>
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
          <div className="cart-section" onClick={() => navigate('/cartitem')} style={{cursor: 'pointer'}}>
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