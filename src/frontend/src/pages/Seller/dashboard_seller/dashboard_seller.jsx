import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './style.scss';

const SellerDashboard = () => {
  const navigate = useNavigate();
  // State quản lý việc đóng/mở của các menu con (mặc định mở)
  const [openMenus, setOpenMenus] = useState({
    orders: true,
    products: true
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth');
    navigate('/seller-login');
  };

  return (
    <div className="seller-dashboard">
      {/* --- Sidebar (Thanh menu bên trái) --- */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Kênh Người Bán</h2>
        </div>
        
        <nav className="sidebar-nav">
          <ul className="menu-list">
            
            {/* Trang chủ */}
            <li className="menu-item">
              <NavLink 
                to="/seller-dashboard" 
                end // Dùng end để chỉ active khi URL chính xác là /seller/dashboard
                className={({isActive}) => isActive ? "menu-link active" : "menu-link"}
              >
                <span className="icon">🏠</span> Trang chủ
              </NavLink>
            </li>

            {/* Nhóm Đơn hàng */}
            <li className="menu-group">
              <div className="menu-group-title" onClick={() => toggleMenu('orders')}>
                <div className="title-left">
                  <span className="icon">📦</span> Đơn hàng
                </div>
                <span className="toggle-icon">{openMenus.orders ? '▼' : '▶'}</span>
              </div>
              
              {openMenus.orders && (
                <ul className="sub-menu">
                  <li>
                    <NavLink to="/seller-dashboard/orders/manage" className={({isActive}) => isActive ? "active" : ""}>
                      Quản lý đơn hàng
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/seller-dashboard/orders/cancellations" className={({isActive}) => isActive ? "active" : ""}>
                      Quản lý yêu cầu hủy đơn
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/seller-dashboard/orders/managereturn" className={({isActive}) => isActive ? "active" : ""}>
                      Quản lý trả hàng
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Nhóm Sản phẩm */}
            <li className="menu-group">
              <div className="menu-group-title" onClick={() => toggleMenu('products')}>
                 <div className="title-left">
                  <span className="icon">🛍️</span> Sản phẩm
                 </div>
                <span className="toggle-icon">{openMenus.products ? '▼' : '▶'}</span>
              </div>

              {openMenus.products && (
                <ul className="sub-menu">
                  <li>
                    <NavLink to="/seller-dashboard/products/manage" className={({isActive}) => isActive ? "active" : ""}>
                      Quản lý sản phẩm
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/seller-dashboard/products/add" className={({isActive}) => isActive ? "active" : ""}>
                      Thêm sản phẩm
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

          </ul>
        </nav>
      </aside>

      {/* --- Main Content Area (Khu vực hiển thị nội dung chính) --- */}
      <main className="dashboard-main">
        {/* Thanh Header nhỏ phía trên Outlet */}
        <header className="dashboard-header">
          <div className="header-left">
            {/* Có thể làm Breadcrumb ở đây sau */}
          </div>
          <div className="header-right">
            <div className="shop-profile">
              <div className="avatar">S</div>
              <span className="shop-name">Shop Của Tôi</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </header>
        
        {/* Nơi render các component con (Thêm sản phẩm, Quản lý đơn hàng...) */}
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SellerDashboard;