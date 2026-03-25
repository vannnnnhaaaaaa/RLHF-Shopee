import React from 'react';
// Import Component NotificationPage mà chúng ta đã viết hôm trước
// LƯU Ý: Bạn nhớ chỉnh lại đường dẫn (../../../components/...) cho đúng với thư mục máy bạn nhé
import NotificationPage from '../../../components/NotificationPage/NotificationPage'; 

const Notifications = () => {
  return (
    // Thẻ div bọc ngoài cùng này giúp bạn dễ dàng tuỳ biến layout riêng cho trang
    // Ví dụ: Bọc thêm Sidebar của trang "My Account" ở bên trái
    <div className="customer-notifications-wrapper" style={{ display: 'flex', gap: '20px', padding: '20px 0' }}>
      
      {/* NẾU BẠN CÓ SIDEBAR TÀI KHOẢN THÌ ĐỂ Ở ĐÂY */}
      {/* <AccountSidebar /> */}

      {/* Phần hiển thị nội dung chính của trang thông báo */}
      <main className="notification-main-content" style={{ flex: 1 }}>
        <NotificationPage />
      </main>

    </div>
  );
};

export default Notifications;