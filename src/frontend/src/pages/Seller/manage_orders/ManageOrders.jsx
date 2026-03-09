import React, { useState } from 'react';
import './style.scss'; // Dùng chung file style hoặc tạo ManageOrders.scss riêng

const ManageOrders = () => {
  const [activeTab, setActiveTab] = useState('cần-gửi');

  // Mock data giả lập các trạng thái đơn hàng
  const [orders, setOrders] = useState([
    {
      id: '260308ABCDEF',
      customer: 'Nguyễn Văn A',
      productName: 'Vở học tập cho trẻ nhỏ, có ô li',
      productImage: 'https://via.placeholder.com/40',
      status: 'Cần gửi',
      shippingMethod: 'Giao nhanh 24h',
      total: 10000,
      date: '08/03/2026'
    },
    {
      id: '260308XYZ123',
      customer: 'Trần Thị B',
      productName: 'Bút bi Thiên Long',
      productImage: 'https://via.placeholder.com/40',
      status: 'Đã gửi',
      shippingMethod: 'Tiêu chuẩn',
      total: 25000,
      date: '06/03/2026'
    }
  ]);

  const tabs = ['Tất cả', 'Cần gửi', 'Đã gửi', 'Đã hoàn tất', 'Chờ xử lý', 'Đã hủy', 'Giao không thành công'];

  return (
    <div className="manage-orders-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-title">
          <h2>Quản lý đơn hàng</h2>
          <span className="subtitle">📢 Người bán cần lưu ý: Đừng để mất thu nhập vì các kiện hàng bị hư hỏng... <a href="#">Tìm hiểu thêm</a></span>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <input type="text" placeholder="Tìm kiếm ID đơn hàng/ID sản phẩm" />
            <button>🔍</button>
          </div>
          <button className="btn-secondary">Nhãn vận chuyển</button>
          <button className="btn-secondary">Chương trình & dịch vụ</button>
          <button className="btn-icon">•••</button>
        </div>
      </div>

      {/* Warning Alert */}
      <div className="warning-alert">
        <span className="icon">⚠️</span>
        <p>Chỉ có thể tạo nhãn sau khi đã cài đặt phương thức thu gom hàng. <a href="#">Cập nhật thông tin</a></p>
        <button className="close-btn">×</button>
      </div>

      {/* To-do List (Việc cần làm) */}
      <div className="todo-section">
        <h3>📋 Việc cần làm</h3>
        <div className="todo-grid">
          <div className="todo-item">
            <p>Vận chuyển trước 23:59 hôm nay</p>
            <h4>0</h4>
          </div>
          <div className="todo-item">
            <p>Tự động hủy trong 24 giờ trở xuống</p>
            <h4>0</h4>
          </div>
          <div className="todo-item">
            <p>Quá hạn vận chuyển</p>
            <h4>0</h4>
          </div>
          <div className="todo-item">
            <p>Hủy</p>
            <h4>0</h4>
          </div>
          <div className="todo-item">
            <p>Vấn đề kho vận</p>
            <h4>0</h4>
          </div>
          <div className="todo-item">
            <p>Đã yêu cầu trả hàng/hoàn tiền</p>
            <h4>0</h4>
          </div>
        </div>
        <div className="todo-footer">
          <span>Vận chuyển đúng hạn khi Giao nhanh 24h ❓ : <strong>--%</strong> (Mục tiêu: 95%) </span>
        </div>
      </div>

      {/* Main Content (Tabs & Table) */}
      <div className="content-container">
        {/* Tabs */}
        <div className="order-tabs">
          {tabs.map((tab, idx) => {
            const tabKey = tab.toLowerCase().replace(/ /g, '-');
            return (
              <button 
                key={idx} 
                className={activeTab === tabKey ? 'active' : ''}
                onClick={() => setActiveTab(tabKey)}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-row">
            <button className="btn-filter"><span>⚙️</span> Bộ lọc (6)</button>
            <select><option>Đang chờ vận chuyển</option></select>
            <select><option>Trạng thái nhãn</option></select>
            <select><option>Nhà cung cấp dịch vụ</option></select>
            <select><option>Nội dung đơn hàng</option></select>
            <div className="spacer"></div>
            <button className="btn-sort"><span>⇅</span> Sắp xếp theo</button>
            <button className="btn-export"><span>📤</span> Xuất</button>
          </div>
          <div className="filter-row secondary-filters">
            <div className="delivery-mode">
              <span>Cách giao hàng:</span>
              <button className="active">Giao nhanh 24h</button>
              <select><option>Cách khác</option></select>
            </div>
            <span className="result-count">↻ Tìm thấy {orders.length} đơn hàng</span>
          </div>
        </div>

        {/* Orders Table */}
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th className="col-check"><input type="checkbox" /></th>
                <th>Đơn hàng</th>
                <th>Khách hàng</th>
                <th>Mặt hàng</th>
                <th>Trạng thái đơn hàng</th>
                <th>Phương thức vận chuyển</th>
                <th>Tổng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr key={idx}>
                  <td className="col-check"><input type="checkbox" /></td>
                  <td className="col-id">
                    <strong>{order.id}</strong><br/>
                    <span className="date">{order.date}</span>
                  </td>
                  <td>{order.customer}</td>
                  <td className="col-product">
                    <img src={order.productImage} alt="Product" />
                    <span className="text-truncate">{order.productName}</span>
                  </td>
                  <td><span className={`status-badge ${order.status === 'Cần gửi' ? 'warning' : 'success'}`}>{order.status}</span></td>
                  <td>{order.shippingMethod}</td>
                  <td><strong>{order.total.toLocaleString('vi-VN')}đ</strong></td>
                  <td>
                    {order.status === 'Cần gửi' && <button className="btn-primary-small">Chuẩn bị hàng</button>}
                    {order.status === 'Đã gửi' && <span className="text-muted">Đang giao...</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageOrders;