import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notification';
import './style.scss'; // Dùng chung file SCSS với Dropdown hoặc tạo file riêng

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const NotificationPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationService.getMyNotifications(0, 50); // Get more notifications for the full page
      setNotifications(response || []);
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
      setError("Không thể tải thông báo");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc:", err);
      alert("Không thể đánh dấu đã đọc");
    }
  };

  const handleNotiClick = async (noti) => {
    // Mark as read if not already read
    if (!noti.is_read) {
      try {
        await notificationService.markAsRead(noti.id);
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n)
        );
      } catch (err) {
        console.error("Lỗi đánh dấu đã đọc:", err);
      }
    }

    // Navigate to order if order_id exists
    if (noti.order_id) {
      navigate('/customer/account/purchase');
    }
  };

  return (
    <div className="notification-page-container">
      <div className="page-header">
        <h2>Thông báo của tôi</h2>
        <button className="mark-read-btn" onClick={markAllAsRead} disabled={loading}>
          Đánh dấu Đã đọc tất cả
        </button>
      </div>

      <div className="notification-full-list">
        {loading ? (
          <div className="loading-state">Đang tải thông báo...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">Bạn chưa có thông báo nào.</div>
        ) : (
          notifications.map(noti => (
            <div
              key={noti.id}
              className={`noti-full-item ${!noti.is_read ? 'unread' : ''}`}
              onClick={() => handleNotiClick(noti)}
            >
              <div className="item-img">
                <img src={noti.image_url || 'https://via.placeholder.com/80'} alt="product" />
              </div>
              <div className="item-details">
                <h3 className="title">{noti.title}</h3>
                <p className="body-text">{noti.body}</p>
                <span className="timestamp">{formatTimeAgo(noti.created_at)}</span>
              </div>
              {!noti.is_read && <div className="unread-dot"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPage;