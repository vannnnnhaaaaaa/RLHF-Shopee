import React from 'react';
import { Outlet } from 'react-router-dom';

import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';

function CustomerLayout() {
  return (
    <div className="layout-container">
      <Navbar />
      
      {/* Phần nội dung chính sẽ thay đổi tùy theo URL */}
      <main style={{ minHeight: '80vh' }}>
        <Outlet /> 
      </main>

      <Footer />
    </div>
  );
}

export default CustomerLayout;