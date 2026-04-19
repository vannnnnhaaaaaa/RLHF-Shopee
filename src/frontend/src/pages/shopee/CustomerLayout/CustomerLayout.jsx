import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import ChatWidget from '../../../components/ChatWidget/ChatWidget';

function CustomerLayout() {
  const location = useLocation();
  const hideChatbot = location.pathname === '/customer/checkout'
    || location.pathname === '/customer/cartitem';

  return (
    <div className="layout-container">
      <Navbar />

      <main style={{ minHeight: '80vh' }}>
        <Outlet />
      </main>

      <Footer />

      {/* Chatbot chỉ hiện khi đang ở trang Shopee (không phải checkout / cart / seller) */}
      {!hideChatbot && <ChatWidget />}
    </div>
  );
}

export default CustomerLayout;