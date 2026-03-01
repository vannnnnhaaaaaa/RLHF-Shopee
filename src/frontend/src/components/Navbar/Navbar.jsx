import React from 'react';
import './style.scss';
// Import các icon từ thư viện
import { FaFacebook, FaInstagram, FaRegUserCircle } from 'react-icons/fa';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { FiHelpCircle, FiSearch, FiShoppingCart } from 'react-icons/fi';
import { TbWorld } from 'react-icons/tb';

function Navbar() {
  return (
    <header className="navbar-container">
      <div className="navbar-content">
        
        {/* === PHẦN TRÊN CÙNG (TOP NAV) === */}
        <nav className="navbar-top">
          <div className="top-left">
            <a href="#">Kênh Người Bán</a>
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
          {/* Logo */}
          <div className="logo-section">
            <div className="logo-icon-fake">S</div> {/* Chỗ này sau thay bằng thẻ img logo thật */}
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
            {/* Gợi ý từ khóa */}
            <div className="search-suggestions">
              <a href="#">Ip16 Thường</a>
              <a href="#">Bánh Oreo</a>
              <a href="#">IP 15 Thường</a>
              <a href="#">IP 16 Thường 256gb</a>
              <a href="#">Đồ Ren Nữ</a>
              <a href="#">Bàn Gaming Ngồi Bệt</a>
            </div>
          </div>

          {/* Giỏ hàng */}
          <div className="cart-section">
            <div className="cart-icon-wrapper">
              <FiShoppingCart className="cart-icon" />
              <span className="cart-badge">1</span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

export default Navbar;