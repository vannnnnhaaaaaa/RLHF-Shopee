import React, { useState, useEffect } from 'react';
import './style.scss';

const AddProduct = () => {
  // --- 1. STATE QUẢN LÝ DỮ LIỆU ---
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    description: '',
    price: '',
    stock: '',
    weight: '',
    length: '',
    width: '',
    height: ''
  });

  const [hasVariants, setHasVariants] = useState(false);
  const [tiers, setTiers] = useState([{ name: '', options: [] }]); 
  const [variantsList, setVariantsList] = useState([]);

  // --- 2. XỬ LÝ SỰ KIỆN CƠ BẢN ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- 3. LOGIC BIẾN THỂ (VARIANTS) ---
  const addTier = () => {
    if (tiers.length < 2) setTiers([...tiers, { name: '', options: [] }]);
  };

  const removeTier = (index) => {
    const newTiers = tiers.filter((_, i) => i !== index);
    setTiers(newTiers);
  };

  const handleTierNameChange = (index, value) => {
    const newTiers = [...tiers];
    newTiers[index].name = value;
    setTiers(newTiers);
  };

  const handleAddOption = (e, tierIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val && !tiers[tierIndex].options.includes(val)) {
        const newTiers = [...tiers];
        newTiers[tierIndex].options.push(val);
        setTiers(newTiers);
        e.target.value = ''; 
      }
    }
  };

  const removeOption = (tierIndex, optionIndex) => {
    const newTiers = [...tiers];
    newTiers[tierIndex].options.splice(optionIndex, 1);
    setTiers(newTiers);
  };

  // Tự động sinh bảng ma trận
  useEffect(() => {
    if (!hasVariants) return;

    const activeTiers = tiers.filter(t => t.name.trim() !== '' && t.options.length > 0);
    if (activeTiers.length === 0) {
      setVariantsList([]);
      return;
    }

    let combos = activeTiers[0].options.map(opt => ({ tier1: opt, tier2: null }));

    if (activeTiers.length === 2) {
      const newCombos = [];
      combos.forEach(c => {
        activeTiers[1].options.forEach(opt2 => {
          newCombos.push({ tier1: c.tier1, tier2: opt2 });
        });
      });
      combos = newCombos;
    }

    setVariantsList(prev => {
      return combos.map(combo => {
        const existing = prev.find(p => p.tier1 === combo.tier1 && p.tier2 === combo.tier2);
        return existing ? existing : { ...combo, price: '', stock: '', sku: '' };
      });
    });
  }, [tiers, hasVariants]);

  const handleVariantChange = (index, field, value) => {
    const newList = [...variantsList];
    newList[index][field] = value;
    setVariantsList(newList);
  };

  // --- 4. SUBMIT FORM ---
  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      hasVariants,
      tiers: hasVariants ? tiers : [],
      variants: hasVariants ? variantsList : []
    };
    console.log("Dữ liệu chuẩn bị đẩy lên API:", payload);
    alert("Vui lòng mở Console F12 để xem cấu trúc JSON!");
  };

  return (
    <div className="add-product-container">
      {/* SIDEBAR TÌM KIẾM NHANH */}
      <aside className="product-sidebar">
        <div className="suggestion-box">
          <h4><span className="icon">📢</span> Đề xuất</h4>
          <p>Thông tin sản phẩm đầy đủ có thể giúp tăng mức độ tiếp xúc cho sản phẩm của bạn.</p>
        </div>
        
        <ul className="nav-menu">
          <li className="active"><a href="#basic-info">Thông tin cơ bản</a></li>
          <li><a href="#product-details">Chi tiết sản phẩm</a></li>
          <li><a href="#sales-info">Thông tin bán hàng</a></li>
          <li><a href="#shipping-info">Vận chuyển</a></li>
        </ul>
      </aside>

      {/* NỘI DUNG FORM CHÍNH */}
      <main className="product-main-content">
        <form onSubmit={handleSubmit}>
          
          {/* ================= SECTION 1: THÔNG TIN CƠ BẢN ================= */}
          <section id="basic-info" className="content-card">
            <h2>Thông tin cơ bản</h2>
            
            {/* Hình ảnh */}
            <div className="form-group">
              <label className="required">Hình ảnh <span>ℹ️</span></label>
              <p className="hint">Bạn nên thêm ít nhất 5 ảnh để thể hiện sản phẩm đầy đủ.</p>
              <div className="image-grid">
                <div className="upload-box main-img">
                  <div className="icon">📤</div>
                  <span>Tải lên ảnh chính</span>
                </div>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="upload-box sub-img">📦</div>
                ))}
              </div>
            </div>

            {/* Tên sản phẩm */}
            <div className="form-group">
              <label className="required">Tên sản phẩm <span>ℹ️</span></label>
              <div className="input-wrapper">
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nhập tên sản phẩm..."
                  maxLength="255"
                  required
                />
                <span className="char-count">{formData.name.length}/255</span>
              </div>
            </div>

            {/* Hạng mục & Thương hiệu */}
            <div className="form-group">
              <label className="required">Hạng mục <span>ℹ️</span></label>
              <div className="select-wrapper">
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option value="" disabled>Chọn hạng mục...</option>
                  <option value="thoi-trang">Thời trang Nam</option>
                  <option value="dien-tu">Thiết bị điện tử</option>
                  <option value="gia-dung">Đồ gia dụng hàng ngày</option>
                </select>
                <span className="ai-suggest">✨ 1 Đề xuất AI</span>
              </div>
            </div>

            <div className="form-group">
              <label className="required">Thương hiệu <span>ℹ️</span></label>
              <select name="brand" value={formData.brand} onChange={handleChange} required>
                <option value="" disabled>Chọn thương hiệu...</option>
                <option value="no-brand">No Brand</option>
                <option value="sony">Sony</option>
              </select>
            </div>
          </section>

          {/* ================= SECTION 2: CHI TIẾT SẢN PHẨM ================= */}
          <section id="product-details" className="content-card">
            <h2>Chi tiết sản phẩm</h2>
            
            <div className="form-group">
              <label className="required">Mô tả</label>
              <div className="editor-container">
                <div className="toolbar">
                  <button type="button">↩</button>
                  <button type="button">↪</button>
                  <div className="divider"></div>
                  <button type="button">B</button>
                  <button type="button">I</button>
                  <button type="button">U</button>
                  <div className="divider"></div>
                  <button type="button">☰</button>
                  <button type="button">☷</button>
                </div>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Nhập mô tả sản phẩm..."
                  rows="8"
                  required
                ></textarea>
              </div>
            </div>

            <div className="form-group">
              <label>Video <span>ℹ️</span></label>
              <p className="hint">Tỷ lệ khung hình từ 9:16 đến 16:9. Kích thước tối đa 100MB.</p>
              <div className="upload-box video-box">
                <div className="icon">🎥</div>
                <span>Video</span>
              </div>
            </div>
          </section>

          {/* ================= SECTION 3: THÔNG TIN BÁN HÀNG ================= */}
          <section id="sales-info" className="content-card">
            <h2>Thông tin bán hàng</h2>
            
            <div className="variant-toggle-wrapper">
              <label className="switch-label">
                <strong>Thêm biến thể</strong>
                <span className="hint">Thêm tối đa 2 biến thể sản phẩm cho kích thước, màu sắc...</span>
              </label>
              <label className="switch">
                <input type="checkbox" checked={hasVariants} onChange={() => setHasVariants(!hasVariants)} />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Không có biến thể */}
            {!hasVariants && (
              <div className="form-row mt-20">
                <div className="form-group half">
                  <label className="required">Giá bán lẻ (đ)</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Nhập giá" required />
                </div>
                <div className="form-group half">
                  <label className="required">Hàng có sẵn</label>
                  <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="Nhập số lượng" required />
                </div>
              </div>
            )}

            {/* Có biến thể */}
            {hasVariants && (
              <div className="variant-builder mt-20">
                {tiers.map((tier, tIndex) => (
                  <div key={tIndex} className="tier-box">
                    <div className="tier-header">
                      <span className="required">Tên biến thể {tIndex + 1} <span>ℹ️</span></span>
                      <button type="button" className="btn-delete" onClick={() => removeTier(tIndex)}>🗑️</button>
                    </div>
                    
                    <div className="tier-body">
                      <div className="form-group mb-15">
                        <input 
                          type="text" 
                          placeholder="Kích thước, Màu sắc..." 
                          value={tier.name}
                          onChange={(e) => handleTierNameChange(tIndex, e.target.value)}
                        />
                      </div>
                      
                      <div className="form-group mb-0">
                        <label className="required">Tùy chọn</label>
                        <div className="options-input-wrapper">
                          <div className="tags-container">
                            {tier.options.map((opt, oIndex) => (
                              <span key={oIndex} className="tag">
                                {opt} <span className="remove-tag" onClick={() => removeOption(tIndex, oIndex)}>×</span>
                              </span>
                            ))}
                          </div>
                          <input 
                            type="text" 
                            placeholder="Thêm giá trị khác (Nhấn Enter để thêm)" 
                            onKeyDown={(e) => handleAddOption(e, tIndex)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {tiers.length < 2 && (
                  <button type="button" className="btn-add-tier" onClick={addTier}>
                    + Thêm biến thể
                  </button>
                )}

                {/* Bảng Danh sách biến thể */}
                {variantsList.length > 0 && (
                  <div className="variant-table-container mt-20">
                    <h4>Danh sách biến thể</h4>
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>{tiers[0]?.name || 'Phân loại 1'}</th>
                          {tiers.length === 2 && <th>{tiers[1]?.name || 'Phân loại 2'}</th>}
                          <th><span className="required">Giá bán lẻ (đ)</span></th>
                          <th><span className="required">Hàng có sẵn</span></th>
                          <th>SKU người bán</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variantsList.map((variant, vIndex) => (
                          <tr key={vIndex}>
                            <td>{variant.tier1}</td>
                            {tiers.length === 2 && <td>{variant.tier2}</td>}
                            <td>
                              <input 
                                type="number" 
                                value={variant.price} 
                                onChange={(e) => handleVariantChange(vIndex, 'price', e.target.value)}
                                placeholder="đ" required 
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={variant.stock} 
                                onChange={(e) => handleVariantChange(vIndex, 'stock', e.target.value)}
                                placeholder="0" required 
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={variant.sku} 
                                onChange={(e) => handleVariantChange(vIndex, 'sku', e.target.value)}
                                placeholder="" 
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ================= SECTION 4: VẬN CHUYỂN ================= */}
          <section id="shipping-info" className="content-card">
            <h2>Vận chuyển</h2>
            
            <div className="form-group">
              <label className="required">Trọng lượng kiện hàng <span>ℹ️</span></label>
              <div className="weight-input-wrapper">
                <span className="unit-label">Gam (g)</span>
                <input 
                  type="number" 
                  name="weight" 
                  value={formData.weight} 
                  onChange={handleChange} 
                  placeholder="Nhập trọng lượng kiện hàng" 
                  required 
                />
              </div>
            </div>

            <div className="form-group mt-20">
              <label>Kích thước kiện hàng <span>ℹ️</span></label>
              <div className="dimension-inputs">
                <div className="dim-box">
                  <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="Chiều cao" />
                  <span>Centimet (cm)</span>
                </div>
                <div className="dim-box">
                  <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="Chiều rộng" />
                  <span>Centimet (cm)</span>
                </div>
                <div className="dim-box">
                  <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="Chiều dài" />
                  <span>Centimet (cm)</span>
                </div>
              </div>
            </div>
            
            <div className="shipping-fee-estimate mt-20">
              <label className="required">Cách giao hàng <span>ℹ️</span></label>
              <div className="radio-group">
                <label><input type="radio" name="shipping_type" defaultChecked /> Mặc định</label>
                <label><input type="radio" name="shipping_type" /> Tùy chỉnh</label>
              </div>
              <p className="fee-text">Phí vận chuyển ước tính -- <span>ℹ️</span></p>
            </div>
          </section>

          {/* ================= FOOTER ACTIONS ================= */}
          <div className="form-actions">
            <button type="button" className="btn-cancel">Hủy</button>
            <button type="submit" className="btn-submit">Lưu & Hiển thị</button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddProduct;