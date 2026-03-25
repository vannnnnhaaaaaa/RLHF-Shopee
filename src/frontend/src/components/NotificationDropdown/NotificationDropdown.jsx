import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { notificationService } from '../../services/notification';
import './style.scss';

// Hàm format thời gian
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  const navigate = useNavigate();

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationService.getMyNotifications(0, 10); // Get first 10 notifications
      setNotifications(response || []);
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
      setError("Không thể tải thông báo");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 400); 
  };

  const handleNotiClick = async (notification) => {
    setIsOpen(false);

    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification.id);
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (err) {
        console.error("Lỗi đánh dấu đã đọc:", err);
      }
    }

    // Navigate to order if order_id exists
    if (notification.order_id) {
      navigate(`/customer/account/purchase`);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/customer/account/notifications');
  };

  return (
    <div 
      className="noti-wrapper" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      <IoMdNotificationsOutline className="icon" /> Thông Báo
      {unreadCount > 0 && <span className="noti-badge">{unreadCount}</span>}

      {isOpen && (
        <div 
          className="noti-dropdown-box"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="noti-header">Thông báo mới nhận</div>

          <div className="noti-list">
            {loading ? (
              <div style={{padding: '20px', textAlign: 'center', color: '#999'}}>
                Đang tải...
              </div>
            ) : error ? (
              <div style={{padding: '20px', textAlign: 'center', color: '#ff4d4f'}}>
                {error}
              </div>
            ) : notifications.length === 0 ? (
               <div style={{padding: '20px', textAlign: 'center', color: '#999'}}>
                 Chưa có thông báo nào
               </div>
            ) : (
               notifications.slice(0, 5).map(noti => (
                <div
                  key={noti.id}
                  className={`noti-item ${!noti.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotiClick(noti)}
                >
                  <div className="noti-img">
                    <img src={noti.image_url || 'https://via.placeholder.com/50'} alt="noti-img" />
                  </div>
                  <div className="noti-content">
                    <h4>{noti.title}</h4>
                    <p>{noti.body}</p>
                    <span className="noti-time">{formatTimeAgo(noti.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="noti-footer" onClick={handleViewAll}>
            Xem Tất Cả
          </div>
        </div>
      )}
    </div>
  );
};