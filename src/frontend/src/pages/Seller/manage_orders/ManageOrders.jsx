import React, { useState, useEffect } from 'react';
import { sellerOrderService } from '../../../services/order';
import './style.scss';

const ManageOrders = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Đã XÓA state refresh đi vì không cần load lại toàn bộ màn hình nữa

  const tabs = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Cần xác nhận', value: 'PENDING' },
    { label: 'Giao tới kho', value: 'ACCEPT' },
    { label: 'Đang giao hàng', value: 'DELIVERING' },
    { label: 'Đã hoàn tất', value: 'COMPLETED' },
    { label: 'Chờ xử lý trả hàng', value: 'PROCESSING_CANCEL' },
    { label: 'Đã hủy', value: 'CANCELLED' }
  ];

  const translateStatus = (status) => {
    switch (status) {
      case 'PENDING': return 'Cần gửi';
      case 'ACCEPT': return 'Đang chuẩn bị'; 
      case 'DELIVERING': return 'Đã gửi';
      case 'COMPLETED': return 'Đã hoàn tất';
      case 'PROCESSING_CANCEL': return 'Chờ hủy';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusParam = activeTab === 'all' ? null : activeTab;
        const result = await sellerOrderService.getOrders(statusParam);
        
        if (result && result.data) {
           setOrders(result.data); 
        } else {
           setOrders([]);
        }
      } catch (err) {
        console.error("Lỗi fetch data:", err);
        setError("Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  // Xóa 'refresh' khỏi mảng dependency
  }, [activeTab]); 

  // --- LOGIC MỚI: CẬP NHẬT CỤC BỘ KHÔNG LOAD TRANG ---

  // Xử lý: Pending -> Accept
  const handlePrepareOrder = async (billId) => {
      try {
          await sellerOrderService.updateOrderStatus(billId, 'ACCEPT');
          
          // Cập nhật State Orders cục bộ
          setOrders(prevOrders => {
              if (activeTab === 'all') {
                  // Nếu ở tab Tất cả -> Chỉ đổi trạng thái dòng đó
                  return prevOrders.map(order => 
                      order.id === billId ? { ...order, status: 'ACCEPT' } : order
                  );
              } else {
                  // Nếu ở tab cụ thể (Cần gửi) -> Bấm xong thì loại bỏ dòng đó khỏi danh sách hiển thị
                  return prevOrders.filter(order => order.id !== billId);
              }
          });

          // (Tùy chọn) Có thể bỏ dòng alert này đi nếu thấy phiền, vì giao diện đã phản hồi ngay lập tức rồi
          // alert("Đã xác nhận chuẩn bị hàng!"); 
      } catch (err) {
          alert("Lỗi: " + (err.response?.data?.detail || "Không thể cập nhật trạng thái"));
      }
  }

  // Xử lý: Accept -> Delivering
  const handleDeliverOrder = async (billId) => {
      try {
          await sellerOrderService.updateOrderStatus(billId, 'DELIVERING');
          
          // Cập nhật State Orders cục bộ
          setOrders(prevOrders => {
              if (activeTab === 'all') {
                  // Đổi trạng thái hiển thị
                  return prevOrders.map(order => 
                      order.id === billId ? { ...order, status: 'DELIVERING' } : order
                  );
              } else {
                  // Xóa khỏi tab 'Đã xác nhận'
                  return prevOrders.filter(order => order.id !== billId);
              }
          });

      } catch (err) {
          alert("Lỗi: " + (err.response?.data?.detail || "Không thể cập nhật trạng thái"));
      }
  }

  // --- KẾT THÚC LOGIC MỚI ---

  return (
    <div className="manage-orders-page">
      <div className="page-header">
        <h2>Quản lý đơn hàng</h2>
      </div>

      <div className="content-container">
        
        {/* Render Tabs */}
        <div className="order-tabs">
          {tabs.map((tab) => (
              <button 
                key={tab.value} 
                className={activeTab === tab.value ? 'active' : ''}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-bar">
             <div className="filter-row secondary-filters">
                <span className="result-count">↻ Tìm thấy {orders.length} đơn hàng</span>
             </div>
        </div>

        {/* Hiện thông báo lỗi hoặc loading */}
        {loading && <p style={{textAlign: 'center', padding: '20px'}}>Đang tải dữ liệu...</p>}
        {error && <p style={{textAlign: 'center', color: 'red', padding: '20px'}}>{error}</p>}

        {/* Orders Table */}
        {!loading && !error && (
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
                {orders.length === 0 ? (
                    <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>Không có đơn hàng nào.</td></tr>
                ) : (
                    orders.map((order, idx) => (
                        <tr key={idx}>
                        <td className="col-check"><input type="checkbox" /></td>
                        <td className="col-id">
                            <strong>{order.id}</strong><br/>
                            <span className="date">{order.date}</span>
                        </td>
                        <td>{order.customer}</td>
                        <td className="col-product">
                            <img src={order.productImage || 'https://via.placeholder.com/40'} alt="Product" />
                            <span className="text-truncate">{order.productName}</span>
                        </td>
                        <td>
                            <span className={`status-badge ${
                                order.status === 'PENDING' ? 'warning' : 
                                order.status === 'ACCEPT' ? 'info' : 'success'
                            }`}>
                                {translateStatus(order.status)}
                            </span>
                        </td>
                        <td>{order.shippingMethod || 'Tiêu chuẩn'}</td>
                        <td><strong>{order.total?.toLocaleString('vi-VN')}đ</strong></td>
                        <td>
                            {/* Nút cho trạng thái PENDING */}
                            {order.status === 'PENDING' && (
                                <button className="btn-primary-small" onClick={() => handlePrepareOrder(order.id)}>
                                    Xác nhận đơn
                                </button>
                            )}
                            
                            {/* Nút cho trạng thái ACCEPT */}
                            {order.status === 'ACCEPT' && (
                                <button 
                                    className="btn-primary-small" 
                                    style={{ backgroundColor: '#17a2b8' }} 
                                    onClick={() => handleDeliverOrder(order.id)}
                                >
                                    Đã đưa giao tới kho
                                </button>
                            )}

                            {/* Các trạng thái còn lại chỉ hiện text */}
                            {order.status === 'DELIVERING' && <span className="text-muted">Đang giao...</span>}
                            {order.status === 'COMPLETED' && <span className="text-success">Hoàn tất</span>}
                            {order.status === 'CANCELLED' && <span className="text-danger">Đã hủy</span>}
                        </td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
            </div>
        )}
      </div>
    </div>
  );
};

export default ManageOrders;