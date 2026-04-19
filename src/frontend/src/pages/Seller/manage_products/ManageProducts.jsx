import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getMyProducts } from '../../../services/product';
import './style.scss';

const ManageProducts = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState('tong-quan');
  const initialTab = searchParams.get('tab') || 'all';
  const [activeSubTab, setActiveSubTab] = useState(initialTab);
  // Thêm state để biết dòng nào đang mở Menu Hành Động
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Hàm toggle menu
  const toggleActionMenu = (id) => {
    if (actionMenuOpen === id) setActionMenuOpen(null);
    else setActionMenuOpen(id);
  };

  // Hàm gọi API vô hiệu hóa (Bạn sẽ viết sau)
  const handleDeactivate = async (id) => {
    // Gọi API PATCH status = 'removed'
    // Cập nhật lại state products để UI tự động render lại
    setActionMenuOpen(null);
  };
  const subTabs = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Trên kệ', value: 'active' },
    { label: 'Đang xem xét', value: 'pending_inbound' },
    { label: 'Bị từ chối', value: 'rejected' },
    { label: 'Đã vô hiệu hóa', value: 'removed' }
  ];

  // States quản lý dữ liệu và UI
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // State quản lý việc mở rộng dòng (hiển thị SKU)
  const [expandedRows, setExpandedRows] = useState([]);

  // Hàm gọi API
  const fetchProducts = async (statusValue) => {
    setLoading(true);
    try {
      const result = await getMyProducts(statusValue, 0, 50);

      if (result.status === 'success') {
        setProducts(result.data);
        setTotalItems(result.metadata.count_returned);
      }
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(activeSubTab);
  }, [activeSubTab]);

  // --- Hàm hỗ trợ UI ---
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'pending_inbound': return 'orange';
      case 'rejected': return 'red';
      case 'removed': return 'gray';
      default: return 'gray';
    }
  };

  // Hàm xử lý hiển thị giá linh hoạt
  const renderPrice = (product) => {
    if (product.has_variants && product.skus?.length > 0) {
      if (product.price_min !== product.price_max) {
        return `${product.price_min?.toLocaleString('vi-VN')}đ - ${product.price_max?.toLocaleString('vi-VN')}đ`;
      }
      return `${product.price_min?.toLocaleString('vi-VN')}đ`;
    }
    return `${product.price?.toLocaleString('vi-VN')}đ`;
  };

  // Hàm xử lý hiển thị tồn kho linh hoạt
  const renderStock = (product) => {
    if (product.has_variants && product.skus?.length > 0) {
      return product.total_stock || 0;
    }
    return product.stock || 0;
  };

  // Toggle dòng SKU
  const toggleRow = (productId) => {
    setExpandedRows(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId) // Nếu đang mở thì đóng lại
        : [...prev, productId]                // Nếu đang đóng thì mở ra
    );
  };

  return (
    <div className="manage-products-page">
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
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Không tìm thấy sản phẩm nào</td>
                </tr>
              ) : (
                products.map((product) => (
                  // Dùng React.Fragment để nhóm 2 dòng (Dòng chính + Dòng SKU phụ)
                  <React.Fragment key={product.id}>
                    {/* --- DÒNG SẢN PHẨM CHÍNH --- */}
                    <tr>
                      <td className="col-checkbox"><input type="checkbox" /></td>
                      <td className="col-product">
                        <div className="product-info-cell">
                          <img
                            src={product.image_link || 'https://via.placeholder.com/50'}
                            alt="Product"
                            className="product-img"
                          />
                          <div className="product-details">
                            <p className="product-name">{product.name}</p>
                            <p className="product-id">ID:{product.id}</p>

                            {/* Nút bật/tắt xem phân loại (Chỉ hiện khi có variant) */}
                            {product.has_variants && product.skus?.length > 0 && (
                              <button
                                className="toggle-sku-btn"
                                onClick={() => toggleRow(product.id)}
                              >
                                {expandedRows.includes(product.id) ? '▲ Ẩn phân loại' : '▼ Xem phân loại'}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="col-performance">
                        <p className="sales-count">{product.sold_count || 0} món bán ra</p>
                        <p className="stats-sub">Lượt xem: 0</p>
                        <p className="stats-sub">Doanh số: 0đ</p>
                      </td>
                      <td className="col-status">
                        <p className="status-badge" style={{ textTransform: 'capitalize' }}>
                          <span className={`dot ${getStatusColor(product.status)}`}></span> {product.status}
                        </p>
                        <p className="status-date">{formatDate(product.create_at)}</p>
                      </td>
                      {/* Gọi hàm render linh hoạt thay vì fix cứng */}
                      <td className="col-stock">{renderStock(product)}</td>
                      <td className="col-price">{renderPrice(product)}</td>
                      <td className="col-actions" style={{ position: 'relative' }}>
                        <button className="action-btn" title="Chỉnh sửa" onClick={() => navigate(`products/edit/${product.id.toString().trim()}`)}>📝</button>
                        <button className="action-btn" onClick={() => toggleActionMenu(product.id)}>⋮</button>

                        {/* Dropdown Menu */}
                        {actionMenuOpen === product.id && (
                          <div className="action-dropdown" style={{ position: 'absolute', right: 0, background: 'white', border: '1px solid #ddd', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', zIndex: 10 }}>
                            {product.status === 'active' ? (
                              <button onClick={() => handleDeactivate(product.id)} style={{ padding: '8px 15px', border: 'none', background: 'none', width: '100%', textAlign: 'left', color: 'red', cursor: 'pointer' }}>Vô hiệu hóa</button>
                            ) : (
                              <button onClick={() => handleActivate(product.id)} style={{ padding: '8px 15px', border: 'none', background: 'none', width: '100%', textAlign: 'left', color: 'green', cursor: 'pointer' }}>Mở bán lại</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* --- DÒNG HIỂN THỊ CÁC SKU (BẢNG PHỤ) --- */}
                    {expandedRows.includes(product.id) && product.skus && (
                      <tr className="sku-expanded-row">
                        <td></td> {/* Để trống cột checkbox */}
                        <td colSpan="6" className="sku-table-container">
                          <table className="sku-inner-table">
                            <thead>
                              <tr>
                                <th>Phân loại hàng</th>
                                <th>Giá bán lẻ</th>
                                <th>Hàng có sẵn</th>
                              </tr>
                            </thead>
                            <tbody>
                              {product.skus.map(sku => (
                                <tr key={sku.id}>
                                  <td className="sku-name">
                                    {sku.tier_1_value} {sku.tier_2_value ? `- ${sku.tier_2_value}` : ''}
                                  </td>
                                  <td className="sku-price">{sku.price.toLocaleString('vi-VN')}đ</td>
                                  <td className="sku-stock">{sku.stock}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
    </div>
  );
};

export default ManageProducts;