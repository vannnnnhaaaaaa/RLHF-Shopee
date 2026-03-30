import React, { useState, useEffect } from 'react';
import purchase_customer_service from '../../../services/purchase'; 
import OrderCard from '../../../components/OrderCard/OrderCard';

import './style.scss';

// Đã cập nhật lại danh sách TABS theo đúng luồng dữ liệu của Seller
const TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'ACCEPT', label: 'Đã xác nhận đơn' },
  { id: 'DELIVERING', label: 'Đang giao' },
  { id: 'COMPLETED', label: 'Đã nhận' },
  { id: 'PROCESSING_CANCEL', label: 'Đang hủy đơn' },
  { id: 'CANCELLED', label: 'Đã hủy' }
];

const LIMIT = 7; 

const Purchase = () => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [page, setPage] = useState(1);

  // --- HÀM MỚI: Cập nhật trạng thái đơn hàng ngay trên giao diện ---
  const handleUpdateOrderInList = (orderId, newStatus) => {
    setOrders((prevOrders) => {
      // Dùng map để tạo mảng mới, tìm đúng orderId và thay đổi status
      return prevOrders.map((order) => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      });
    });
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1); 
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const data = await purchase_customer_service.getOrderStatus(activeTab, page, LIMIT);
        setOrders(Array.isArray(data) ? data : []); 
      } catch (error) {
        console.error("Lỗi khi tải đơn hàng:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [activeTab, page]); 

  return (
    <div className="purchase-container">
      
      {/* 1. Thanh Tabs */}
      <div className="tabs-container">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2. Thanh tìm kiếm */}
      <div className="search-bar">
        <svg xmlns="http://www.w3.org/2000/svg" className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Tìm kiếm theo Tên Shop, Mã đơn hàng hoặc Tên sản phẩm"
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 3. Danh sách Đơn hàng Component */}
      <div className="orders-list">
        {isLoading ? (
          <div className="loading-text">Đang tải dữ liệu...</div>
        ) : orders && orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onUpdateSuccess={handleUpdateOrderInList} // <-- TRUYỀN HÀM XUỐNG ĐÂY
            />
          ))
        ) : (
          <div className="empty-state">
            Chưa có đơn hàng
          </div>
        )}
      </div>

      {/* 4. Khu vực Phân trang (Pagination) */}
      {!isLoading && orders.length > 0 && (
        <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
          <button 
            onClick={() => setPage((prev) => prev - 1)} 
            disabled={page === 1}
            className="pagination-btn"
          >
            Trang trước
          </button>
          
          <span style={{ fontWeight: 'bold' }}>Trang {page}</span>
          
          <button 
            onClick={() => setPage((prev) => prev + 1)} 
            disabled={orders.length < LIMIT} 
            className="pagination-btn"
          >
            Trang sau
          </button>
        </div>
      )}

    </div>
  );
};

export default Purchase;