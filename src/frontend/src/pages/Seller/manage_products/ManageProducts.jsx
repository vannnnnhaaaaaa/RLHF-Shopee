import React, { useState } from 'react';
import './style.scss';

const ManageProducts = () => {
  const [activeMainTab, setActiveMainTab] = useState('tong-quan');
  const [activeSubTab, setActiveSubTab] = useState('tat-ca');

  // Dữ liệu giả lập (Mock Data) dựa theo ảnh
  const [products, setProducts] = useState([
    {
      id: '1734320794059572579',
      name: 'Vở học tập cho trẻ nhỏ, có ô li, 96 trang',
      image: 'https://via.placeholder.com/50', // Thay bằng link ảnh thật nếu có
      sales: 0,
      views: 522,
      revenue: 0,
      status: 'Trên kệ',
      statusDate: '05/02/2026 13:42',
      stock: 1,
      price: 10000
    }
  ]);

  return (
    <div className="manage-products-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-title">
          <h2>Quản lý sản phẩm</h2>
          <a href="#" className="help-link">💡 Hướng dẫn & Trợ giúp</a>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">Gói sản phẩm</button>
          <button className="btn-secondary">Thao tác hàng loạt <span>▼</span></button>
          <div className="btn-group-primary">
            <button className="btn-primary main-action">Thêm sản phẩm</button>
            <button className="btn-primary dropdown-action">▼</button>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
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

      {/* Content Area */}
      <div className="content-container">
        {/* Sub Tabs */}
        <div className="sub-tabs">
          {['Tất cả', 'Trên kệ 1', 'Đang xem xét 0', 'Cần chú ý 0', 'Đã vô hiệu hóa', 'Bản nháp', 'Đã xóa'].map((tab, idx) => {
            const tabKey = tab.toLowerCase().replace(/ /g, '-');
            return (
              <button 
                key={idx} 
                className={activeSubTab === tabKey ? 'active' : ''}
                onClick={() => setActiveSubTab(tabKey)}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <div className="search-box">
              <input type="text" placeholder="Tên sản phẩm, ID hoặc SKU" />
              <span className="search-icon">🔍</span>
            </div>
            <select defaultValue="">
              <option value="" disabled>Hạng mục</option>
              <option value="1">Đồ gia dụng</option>
            </select>
            <select defaultValue="">
              <option value="" disabled>Trạng thái</option>
              <option value="1">Còn hàng</option>
            </select>
            <button className="btn-filter"><span>⚙️</span> Bộ lọc</button>
          </div>
          <button className="btn-sort"><span>⇅</span> Sắp xếp theo</button>
        </div>

        {/* Data Table */}
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
              {products.map((product, index) => (
                <tr key={index}>
                  <td className="col-checkbox"><input type="checkbox" /></td>
                  <td className="col-product">
                    <div className="product-info-cell">
                      <img src={product.image} alt="Product" className="product-img" />
                      <div className="product-details">
                        <p className="product-name">{product.name}</p>
                        <p className="product-id">ID:{product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="col-performance">
                    <p className="sales-count">{product.sales} món bán ra</p>
                    <p className="stats-sub">Lượt xem: {product.views}</p>
                    <p className="stats-sub">Doanh số: {product.revenue}đ</p>
                  </td>
                  <td className="col-status">
                    <p className="status-badge"><span className="dot green"></span> {product.status}</p>
                    <p className="status-date">{product.statusDate}</p>
                  </td>
                  <td className="col-stock">{product.stock}</td>
                  <td className="col-price">{product.price.toLocaleString('vi-VN')}đ</td>
                  <td className="col-actions">
                    <button className="action-btn" title="Chỉnh sửa">📝</button>
                    <button className="action-btn" title="Thêm">⋮</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination-bar">
          <span className="total-items">Tổng số hàng: {products.length}</span>
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

      {/* Floating Action Button (Sparkle) */}
      <button className="floating-ai-btn">✨</button>
    </div>
  );
};

export default ManageProducts;