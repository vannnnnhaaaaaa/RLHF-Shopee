import React, { useState } from 'react';
import './style.scss'; 

const ReturnManage = () => {
  const [activeTab, setActiveTab] = useState('tat-ca');

  const tabs = [
    { id: 'tat-ca', label: 'Tất cả' },
    { id: 'dang-cho-ban', label: 'Đang chờ bạn 0' },
    { id: 'dang-cho-shopee', label: 'Đang chờ Shopee/khách hàng 0' },
    { id: 'da-khieu-nai', label: 'Đã khiếu nại/tranh chấp' },
    { id: 'da-giai-quyet', label: 'Đã giải quyết' }
  ];

  return (
    <div className="return-manage-page">
      {/* --- HEADER --- */}
      <div className="page-header">
        <h2 className="page-title">Quản lý đơn trả hàng/hoàn tiền</h2>
        
        <div className="header-actions">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Tìm kiếm ID đơn hàng trả lại, ID đơn hàng" 
            />
            <button className="search-btn">🔍</button>
          </div>
          <button className="btn-settings">
            <span>⚙️</span> Cài đặt trả hàng
          </button>
        </div>
      </div>

      <div className="content-card">
        {/* --- STATS ROW (Dải thống kê) --- */}
        <div className="stats-row">
          <div className="stat-item">
            <p className="stat-label">Phản hồi trong 24 giờ</p>
            <h3 className="stat-value">0</h3>
          </div>
          <div className="stat-item">
            <p className="stat-label">Tự động phê duyệt (7 ngày qua)</p>
            <h3 className="stat-value">0</h3>
          </div>
          <div className="stat-item">
            <p className="stat-label">Có thể khiếu nại</p>
            <h3 className="stat-value">0</h3>
          </div>
          <div className="stat-item highlight">
            <p className="stat-label">
              Tranh chấp đang chờ phản hồi <span className="tooltip-icon">❓</span>
            </p>
            <h3 className="stat-value">
              0 <a href="#" className="view-link">Xem</a>
            </h3>
          </div>
        </div>

        {/* --- TABS --- */}
        <div className="tabs-container">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- TOOLBAR --- */}
        <div className="toolbar-container">
          <div className="toolbar-actions">
            <button className="icon-btn" title="Bộ lọc">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6"></path></svg>
            </button>
            <button className="icon-btn" title="Sắp xếp">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M7 15l5 5 5-5M7 9l5-5 5 5"></path></svg>
            </button>
            <button className="icon-btn" title="Tải xuống">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5l5 5 5-5m-5 5V3"></path></svg>
            </button>
          </div>
        </div>

        {/* --- BẢNG DỮ LIỆU (EMPTY STATE) --- */}
        <div className="table-container">
           {/* Nơi này sẽ render table hoặc trạng thái trống tùy theo data */}
           <div className="empty-state-simple">
              <p>Chưa có dữ liệu trả hàng/hoàn tiền</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnManage;