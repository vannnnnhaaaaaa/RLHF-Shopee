import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerOrderService } from '../../../services/order';
import { getSellerOverview } from '../../../services/product';
import './style.scss';

const useDashboardStats = () => {
  const [stats, setStats] = useState({
    pending_count: 0,
    accepted_count: 0,
    cancellation_request_count: 0,
    out_of_stock_count: 0,
    locked_products_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sellerOrderService.getDashboardStats();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi lấy thống kê dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};

const useAnalyticsStats = () => {
  const [analytics, setAnalytics] = useState({
    total_views: 0,
    total_orders: 0,
    total_revenue: 0,
    conversion_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSellerOverview();
      if (data.status === 'success') {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi lấy thống kê analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, refetch: fetchAnalytics };
};

const HomeDashboard = () => {
  const navigate = useNavigate();
  const { stats, loading, refetch } = useDashboardStats();
  const { analytics, loading: analyticsLoading } = useAnalyticsStats();

  const fmtVnd = (n) =>
    typeof n === 'number' ? n.toLocaleString('vi-VN') + ' đ' : '—';

  return (
    <div className="home-dashboard-page">
      {/* --- Lời chào & Thông báo --- */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>Chào buổi sáng, Shop Của Bạn!</h2>
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
          <button className="btn-refresh" onClick={refetch} disabled={loading}>
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
        </div>

        <div className="todo-grid">
          {/* Box 1: Chờ xác nhận */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/manage?tab=PENDING')}>
            <h4 className="text-blue">{loading ? '...' : stats.pending_count}</h4>
            <p>Chờ xác nhận</p>
          </div>

          {/* Box 2: Chờ lấy hàng */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/manage?tab=ACCEPT')}>
            <h4 className="text-orange">{loading ? '...' : stats.accepted_count}</h4>
            <p>Chờ lấy hàng</p>
          </div>

          {/* Box 3: Yêu cầu hủy */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/manage?tab=PROCESSING_CANCEL')}>
            <h4 className="text-red">{loading ? '...' : stats.cancellation_request_count}</h4>
            <p>Yêu cầu hủy đơn</p>
          </div>

          {/* Box 4: Trả hàng / Hoàn tiền */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/orders/managereturn')}>
            <h4 className="text-teal">0</h4>
            <p>Trả hàng/Hoàn tiền</p>
          </div>

          {/* Box 5: Sản phẩm hết hàng */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/products/manage')}>
            <h4 className="text-gray">{loading ? '...' : stats.out_of_stock_count}</h4>
            <p>Sản phẩm hết hàng</p>
          </div>

          {/* Box 6: Sản phẩm bị khóa */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/products/manage?tab=removed')}>
            <h4 className="text-gray">{loading ? '...' : stats.locked_products_count}</h4>
            <p>Sản phẩm bị khóa</p>
          </div>

          {/* Box 7: Voucher */}
          <div className="todo-card" onClick={() => navigate('/seller-dashboard/voucher/manage')}>
            <h4 className="text-purple">🎟️</h4>
            <p>Quản lý Voucher</p>
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
          <div className="stat-card">
            <div className="stat-icon bg-green">💰</div>
            <div className="stat-info">
              <p>Doanh thu</p>
              <h3>{analyticsLoading ? '...' : fmtVnd(analytics.total_revenue)}</h3>
              <span className="trend up">📈 Từ đơn thành công</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-blue">📦</div>
            <div className="stat-info">
              <p>Đơn hàng</p>
              <h3>{analyticsLoading ? '...' : analytics.total_orders}</h3>
              <span className="trend up">📈 Từ đơn thành công</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-orange">👁️</div>
            <div className="stat-info">
              <p>Lượt truy cập</p>
              <h3>{analyticsLoading ? '...' : analytics.total_views.toLocaleString('vi-VN')}</h3>
              <span className="trend up">👁️ Lượt xem sản phẩm</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-purple">⚡</div>
            <div className="stat-info">
              <p>Tỷ lệ chuyển đổi</p>
              <h3>{analyticsLoading ? '...' : analytics.conversion_rate + '%'}</h3>
              <span className="trend up">⚡ Đơn / Lượt xem</span>
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
