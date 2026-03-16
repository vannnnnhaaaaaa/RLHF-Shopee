import React, { useState, useEffect } from 'react';
import { purchaseApi } from '../../../services/purchase';
import OrderCard from '../../../components/OrderCard/OrderCard';
import './style.scss';

const TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'TO_PAY', label: 'To Pay' },
  { id: 'TO_SHIP', label: 'To Ship' },
  { id: 'TO_RECEIVE', label: 'To Receive' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'RETURN_REFUND', label: 'Return Refund' },
];

const Purchase = () => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Gọi API giả lập mỗi khi tab thay đổi
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const data = await purchaseApi.getOrders(activeTab, searchQuery);
        setOrders(data);
      } catch (error) {
        console.error("Lỗi khi tải đơn hàng:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [activeTab]);

  return (
    <div className="purchase-container">
      
      {/* 1. Thanh Tabs */}
      <div className="tabs-container">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
          placeholder="You can search by Seller Name, Order ID or Product name"
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 3. Danh sách Đơn hàng Component */}
      <div className="orders-list">
        {isLoading ? (
          <div className="loading-text">Đang tải dữ liệu...</div>
        ) : orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        ) : (
          <div className="empty-state">
            Chưa có đơn hàng
          </div>
        )}
      </div>

    </div>
  );
};

export default Purchase;