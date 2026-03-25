import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import './style.scss';

function UserAccount() {
  // Quản lý trạng thái Tab đang được chọn
  const [activeTab, setActiveTab] = useState('All');
  const navigate = useNavigate()
  const tabs = ['All', 'To Pay', 'To Ship', 'To Receive', 'Completed', 'Cancelled', 'Return Refund'];

  return (
    <div className="profile-page-container">

      {/* CỘT TRÁI: SIDEBAR MENU */}
      <aside className="profile-sidebar">
        <div className="user-info">
          <div className="avatar-placeholder">
            <img src="https://via.placeholder.com/50" alt="avatar" />
          </div>
          <div className="user-details">
            <span className="username">phungvanha1</span>
            <span className="edit-profile">✏️ Edit Profile</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-item" onClick={() => navigate('/customer/account')}>👤 My Profile</div>
          <div className="menu-item" onClick={() => navigate('/customer/account/purchase')}>📋 My Purchase</div>
          <div className="menu-item" onClick={() => navigate('/customer/account/notifications')}>🔔 Notifications</div>
          <div className="menu-item">🎟️ My Vouchers</div>

        </nav>
      </aside>

      {/* CỘT PHẢI: NỘI DUNG CHÍNH */}
      <main className="profile-content">
        <Outlet />
      </main>
    </div>
  );
}

export default UserAccount;