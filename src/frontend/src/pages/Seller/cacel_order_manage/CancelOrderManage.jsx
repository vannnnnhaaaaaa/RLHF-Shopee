import React, { useState } from 'react';
import './style.scss'; // Dùng chung file style hoặc tạo riêng CancelOrderManage.scss

const CancelOrderManage = () => {
  const [activeTab, setActiveTab] = useState('tat-ca');

  // Khởi tạo mảng rỗng để giả lập màn hình "Không tìm thấy kết quả" như trong ảnh
  const [cancelRequests, setCancelRequests] = useState([]);

  const tabs = [
    { id: 'tat-ca', label: 'Tất cả' },
    { id: 'can-xu-ly', label: 'Cần xử lý' },
    { id: 'da-hoan-thanh', label: 'Đã hoàn thành' },
    { id: 'da-dong', label: 'Đã đóng' }
  ];

  return (
    <div className="cancel-order-page">
      <h2 className="page-title">Quản lý yêu cầu hủy đơn</h2>

      <div className="content-card">
        {/* --- Tabs --- */}
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

        {/* --- Thanh Công Cụ Lọc (Filter Bar) --- */}
        <div className="filter-bar">
          <div className="search-group">
            <div className="search-input-wrapper">
              <input 
                type="text" 
                placeholder="Tìm kiếm ID đơn hàng trả lại, ID đơn hàng hoặc số theo dõi trả hàng" 
              />
              <span className="icon-search">🔍</span>
            </div>
            
            <div className="date-picker-wrapper">
              <input type="text" placeholder="Từ    -    Đến" readOnly />
              <span className="icon-calendar">📅</span>
            </div>
            
            <button className="btn-bookmark" title="Lưu bộ lọc">🔖</button>
          </div>
          
          <div className="sort-group">
            <select className="sort-select">
              <option>Sắp xếp theo</option>
              <option>Mới nhất</option>
              <option>Cũ nhất</option>
            </select>
          </div>
        </div>

        {/* --- Thanh Hành Động (Action Bar) --- */}
        <div className="action-bar">
          <span className="result-count">{cancelRequests.length} đơn hàng hủy đã lọc ra</span>
          <div className="action-buttons">
            <button className="btn-secondary">Xuất đơn hàng</button>
            <button className="btn-secondary">Lịch sử xuất dữ liệu</button>
          </div>
        </div>

        {/* --- Bảng Dữ Liệu (Table) --- */}
        <div className="table-container">
          <table className="cancel-table">
            <thead>
              <tr>
                <th>ID đơn trả hàng</th>
                <th>ID đơn hàng</th>
                <th>Lý do hủy</th>
                <th>Tổng hoàn tiền</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {cancelRequests.length > 0 ? (
                cancelRequests.map((req, index) => (
                  <tr key={index}>
                    {/* Render dữ liệu nếu có */}
                    <td>{req.returnId}</td>
                    <td>{req.orderId}</td>
                    <td>{req.reason}</td>
                    <td>{req.amount}</td>
                    <td>{req.status}</td>
                    <td><button>Xử lý</button></td>
                  </tr>
                ))
              ) : (
                // Render Empty State nếu không có dữ liệu
                <tr>
                  <td colSpan="6" className="empty-state-cell">
                    <div className="empty-state">
                      {/* Biểu tượng minh họa đơn giản */}
                      <div className="empty-illustration">
                        <div className="doc-icon">
                          <div className="magnifier">🔍</div>
                        </div>
                        <div className="dot pink"></div>
                        <div className="dot teal"></div>
                      </div>
                      <p>Không tìm thấy kết quả</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderManage;