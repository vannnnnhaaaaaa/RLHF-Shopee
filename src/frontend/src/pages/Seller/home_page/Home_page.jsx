import React from 'react';
import { useNavigate } from 'react-router-dom';
import './style.scss'; // Dùng chung hoặc tạo HomeDashboard.scss riêng

const HomeDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="home-dashboard-page">
      {/* --- Lời chào & Thông báo --- */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>Chào buổi sáng, Shop Của Bạn! ☀️</h2>
          <p>Hôm nay là một ngày tuyệt vời để bứt phá doanh thu. Hãy xem bạn có gì mới nhé.</p>
        </div>
        <div className="system-alert">
          <span className="icon">📢</span>
          <p><strong>Cập nhật hệ thống:</strong> Tính năng tính phí vận chuyển tự động đã được kích hoạt!</p>
        </div>
      </div>

      {/* --- Section 1: Việc cần làm (To-Do List) --- */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>📋 Việc cần làm</h3>
          <span className="subtitle">Những việc bạn cần xử lý ngay để duy trì hiệu suất</span>
        </div>
        
        <div className="todo-grid">
          {/* Box 1: Chờ xác nhận */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/manage')}>
            <h4 className="text-blue">12</h4>
            <p>Chờ xác nhận</p>
          </div>
          
          {/* Box 2: Chờ lấy hàng */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/manage')}>
            <h4 className="text-orange">5</h4>
            <p>Chờ lấy hàng</p>
          </div>
          
          {/* Box 3: Yêu cầu hủy */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/cancellations')}>
            <h4 className="text-red">1</h4>
            <p>Yêu cầu hủy đơn</p>
          </div>
          
          {/* Box 4: Trả hàng / Hoàn tiền */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/managereturn')}>
            <h4 className="text-teal">0</h4>
            <p>Trả hàng/Hoàn tiền</p>
          </div>

          {/* Box 5: Sản phẩm hết hàng */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/manage')}>
            <h4 className="text-gray">3</h4>
            <p>Sản phẩm hết hàng</p>
          </div>
          
          {/* Box 6: Sản phẩm bị khóa */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/manage')}>
            <h4 className="text-gray">0</h4>
            <p>Sản phẩm bị khóa</p>
          </div>
        </div>
      </div>

      {/* --- Section 2: Phân tích bán hàng (Business Insights) --- */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>📊 Phân tích bán hàng</h3>
          <select className="date-filter">
            <option>Hôm nay</option>
            <option>Hôm qua</option>
            <option>7 ngày qua</option>
            <option>30 ngày qua</option>
          </select>
        </div>

        <div className="stats-grid">
          {/* Stat 1: Doanh thu */}
          <div className="stat-card">
            <div className="stat-icon bg-green">💰</div>
            <div className="stat-info">
              <p>Doanh thu</p>
              <h3>1,250,000 đ</h3>
              <span className="trend up">↑ 15% vs hôm qua</span>
            </div>
          </div>

          {/* Stat 2: Đơn hàng */}
          <div className="stat-card">
            <div className="stat-icon bg-blue">📦</div>
            <div className="stat-info">
              <p>Đơn hàng</p>
              <h3>18</h3>
              <span className="trend up">↑ 2 đơn vs hôm qua</span>
            </div>
          </div>

          {/* Stat 3: Lượt truy cập */}
          <div className="stat-card">
            <div className="stat-icon bg-orange">👁️</div>
            <div className="stat-info">
              <p>Lượt truy cập</p>
              <h3>342</h3>
              <span className="trend down">↓ 5% vs hôm qua</span>
            </div>
          </div>

          {/* Stat 4: Tỷ lệ chuyển đổi */}
          <div className="stat-card">
            <div className="stat-icon bg-purple">⚡</div>
            <div className="stat-info">
              <p>Tỷ lệ chuyển đổi</p>
              <h3>5.2%</h3>
              <span className="trend up">↑ 1.1% vs hôm qua</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- Section 3: Kênh Marketing & Cập nhật --- */}
      <div className="marketing-section">
        <div className="marketing-banner">
          <div className="banner-content">
            <h3>🚀 Đăng ký Flash Sale Chủ Nhật</h3>
            <p>Tăng gấp 3 lần doanh số của bạn bằng cách tham gia chương trình Flash Sale cuối tuần này.</p>
            <button className="btn-join">Đăng ký ngay</button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default HomeDashboard;