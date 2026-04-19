import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import axios from 'axios';
import './style.scss';
import { FaFacebook, FaInstagram, FaRegUserCircle } from 'react-icons/fa';
import { FiHelpCircle, FiSearch, FiShoppingCart } from 'react-icons/fi';
import { TbWorld } from 'react-icons/tb';
import { NotificationDropdown } from '../NotificationDropdown'; 

function Navbar() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  
  // [THÊM MỚI]: State lưu trữ từ khóa tìm kiếm
  const [searchInput, setSearchInput] = useState('');

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

  useEffect(() => {
    fetchCartCount();
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
  }, []);

  // [THÊM MỚI]: Hàm xử lý khi người dùng bấm nút Tìm Kiếm hoặc Enter
  const handleSearch = (e) => {
    e.preventDefault(); // Ngăn trang bị reload
    if (searchInput.trim()) {
      // Đẩy người dùng về trang customer kèm từ khóa trên URL
      navigate(`/customer?keyword=${encodeURIComponent(searchInput)}`);
    } else {
      // Nếu không nhập gì, về lại trang chủ gốc
      navigate(`/customer`);
    }
  };

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        
        <nav className="navbar-top">
          {/* ... (Phần Top Nav giữ nguyên không đổi) ... */}
          <div className="top-left">
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
            <NotificationDropdown />
            <div className="nav-item">
              <FiHelpCircle className="icon" /> Hỗ Trợ
            </div>
            <div className="nav-item">
              <TbWorld className="icon" /> Tiếng Việt
            </div>
            <div className="nav-item user-profile" onClick={()=>navigate('/customer/account')}>
              <FaRegUserCircle className="icon" /> My Account
            </div>
          </div>
        </nav>

        <div className="navbar-main">
          <div className="logo-section" onClick={() => navigate('/customer')} style={{cursor: 'pointer'}}>
            <div className="logo-icon-fake">S</div>
            <span className="logo-text">Shopee</span>
          </div>

          <div className="search-section">
            {/* [SỬA TẠI ĐÂY]: Đổi div thành form để bắt sự kiện Submit */}
            <form className="search-bar" onSubmit={handleSearch}>
              <input 
                type="text" 
                placeholder="Tìm kiếm sản phẩm..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)} // Cập nhật state khi gõ
              />
              <button type="submit" className="search-btn">
                <FiSearch />
              </button>
            </form>
            
            <div className="search-suggestions">
              <a href="#">Ip16 Thường</a>
              <a href="#">Bánh Oreo</a>
              <a href="#">IP 15 Thường</a>
            </div>
          </div>

          <div className="cart-section" onClick={() => navigate('/customer/cartitem')} style={{cursor: 'pointer'}}>
            <div className="cart-icon-wrapper">
              <FiShoppingCart className="cart-icon" />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

export default Navbar;