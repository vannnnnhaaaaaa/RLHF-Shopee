import React, { useState, useEffect } from 'react';
import { getMyProducts } from '../../../services/product'; // Đảm bảo đường dẫn này đúng
import './style.scss';
import { useNavigate } from 'react-router-dom';
const ManageProducts = () => {
  const [activeMainTab, setActiveMainTab] = useState('tong-quan');
    const navigate = useNavigate()
  // 1. Cấu hình các Tab và giá trị status tương ứng với Database
  const subTabs = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Trên kệ', value: 'active' },
    { label: 'Đang xem xét', value: 'pending_inbound' },
    { label: 'Bị từ chối', value: 'rejected' },
    { label: 'Đã vô hiệu hóa', value: 'removed' }
  ];
  
  const [activeSubTab, setActiveSubTab] = useState('all');
  
  // 2. States quản lý dữ liệu và UI
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0); // Để hiện "Tổng số hàng: X"

  // 3. Hàm gọi API
  const fetchProducts = async (statusValue) => {
    setLoading(true);
    try {
      // Giả sử ta đang lấy trang 1 (skip=0), mỗi trang 50 sản phẩm
      const result = await getMyProducts(statusValue, 0, 50);
      
      if (result.status === 'success') {
        setProducts(result.data);
        setTotalItems(result.metadata.count_returned); // Lấy số lượng từ backend
      }
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
      // alert("Có lỗi xảy ra khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Hook tự động chạy khi đổi Tab
  useEffect(() => {
    fetchProducts(activeSubTab);
  }, [activeSubTab]);

  // --- Hàm hỗ trợ ---
  // Format ngày từ "2026-03-09T23:25:51" thành "09/03/2026 23:25"
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa cập nhật';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Ánh xạ màu sắc cho chấm trạng thái (Tùy chọn)
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'pending_inbound': return 'orange';
      case 'rejected': return 'red';
      case 'removed': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <div className="manage-products-page">
      {/* ... Header và Main Tabs giữ nguyên ... */}
      <div className="page-header">
        <div className="header-title">
          <h2>Quản lý sản phẩm</h2>
          <a href="#" className="help-link">💡 Hướng dẫn & Trợ giúp</a>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">Gói sản phẩm</button>
          <button className="btn-secondary">Thao tác hàng loạt <span>▼</span></button>
          <div className="btn-group-primary">
            <button className="btn-primary main-action" onClick={() => navigate('/seller-dashboard/products/add')}>Thêm sản phẩm</button>
            <button className="btn-primary dropdown-action">▼</button>
          </div>
        </div>
      </div>

      <div className="main-tabs">
        <button 
          className={activeMainTab === 'tong-quan' ? 'active' : ''} 
          onClick={() => setActiveMainTab('tong-quan')}
        >
          Tổng quan
        </button>
        <button 
          className={activeMainTab === 'cai-thien' ? 'active' : ''} 
          onClick={() => setActiveMainTab('cai-thien')}
        >
          Cải thiện chất lượng bài niêm yết
        </button>
      </div>

      <div className="content-container">
        {/* --- Render Sub Tabs --- */}
        <div className="sub-tabs">
          {subTabs.map((tab, idx) => (
            <button 
              key={idx} 
              className={activeSubTab === tab.value ? 'active' : ''}
              onClick={() => setActiveSubTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ... Filter Bar giữ nguyên ... */}
        
        {/* --- Data Table --- */}
        <div className="table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th className="col-checkbox"><input type="checkbox" /></th>
                <th className="col-product">Sản phẩm</th>
                <th className="col-performance">Hiệu suất <span>↕</span></th>
                <th className="col-status">Trạng thái <span>↕</span></th>
                <th className="col-stock">Hàng có sẵn</th>
                <th className="col-price">Giá bán lẻ <span>↕</span></th>
                <th className="col-actions">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>Đang tải dữ liệu...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', padding: '20px'}}>Không tìm thấy sản phẩm nào</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="col-checkbox"><input type="checkbox" /></td>
                    <td className="col-product">
                      <div className="product-info-cell">
                        {/* Hiển thị ảnh, nếu null thì dùng ảnh mặc định */}
                        <img 
                          src={product.image_link || 'https://via.placeholder.com/50'} 
                          alt="Product" 
                          className="product-img" 
                        />
                        <div className="product-details">
                          <p className="product-name">{product.name}</p>
                          <p className="product-id">ID:{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="col-performance">
                      <p className="sales-count">{product.sold_count || 0} món bán ra</p>
                      <p className="stats-sub">Lượt xem: 0</p>
                      <p className="stats-sub">Doanh số: 0đ</p>
                    </td>
                    <td className="col-status">
                      <p className="status-badge" style={{textTransform: 'capitalize'}}>
                        <span className={`dot ${getStatusColor(product.status)}`}></span> {product.status}
                      </p>
                      <p className="status-date">{formatDate(product.create_at)}</p>
                    </td>
                    <td className="col-stock">{product.stock}</td>
                    <td className="col-price">{product.price.toLocaleString('vi-VN')}đ</td>
                    <td className="col-actions">
                      <button className="action-btn" title="Chỉnh sửa">📝</button>
                      <button className="action-btn" title="Thêm">⋮</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- Pagination --- */}
        <div className="pagination-bar">
          <span className="total-items">Tổng số hàng: {totalItems}</span>
          <div className="page-controls">
            <button className="page-btn disabled">{"<"}</button>
            <button className="page-btn active">1</button>
            <button className="page-btn disabled">{">"}</button>
          </div>
          <select className="items-per-page" defaultValue="50">
            <option value="10">10/Trang</option>
            <option value="20">20/Trang</option>
            <option value="50">50/Trang</option>
          </select>
        </div>
      </div>
      
      <button className="floating-ai-btn">✨</button>
    </div>
  );
};

export default ManageProducts;