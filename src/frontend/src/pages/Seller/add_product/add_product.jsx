import React, { useState, useEffect } from 'react';
import './style.scss';

const CATEGORIES = [
  { id: "bach_hoa_online", name: "Bách Hóa Online" },
  { id: "balo_tui_vi_nam", name: "Balo & Túi Ví Nam" },
  { id: "cham_soc_thu_cung", name: "Chăm Sóc Thú Cưng" },
  { id: "do_choi", name: "Đồ Chơi" },
  { id: "dong_ho", name: "Đồng Hồ" },
  { id: "dung_cu_va_thiet_bi_tien_ich", name: "Dụng Cụ & Thiết Bị Tiện Ích" },
  { id: "giat_giu_cham_soc_nha_cua", name: "Giặt Giũ & Chăm Sóc Nhà Cửa" },
  { id: "giay_dep_nam", name: "Giày Dép Nam" },
  { id: "giay_dep_nu", name: "Giày Dép Nữ" },
  { id: "may_anh_may_quay_phim", name: "Máy Ảnh & Máy Quay Phim" },
  { id: "may_tinh_lap_top", name: "Máy Tính & Laptop" },
  { id: "me_va_be", name: "Mẹ & Bé" },
  { id: "nha_cua_doi_song", name: "Nhà Cửa & Đời Sống" },
  { id: "nha_sach_online", name: "Nhà Sách Online" },
  { id: "oto_xe_may_xe_dap", name: "Ô Tô, Xe Máy, Xe Đạp" },
  { id: "phu_kien_dien_thoai", name: "Phụ Kiện Điện Thoại" },
  { id: "phu_kien_trang_suc_nu", name: "Phụ Kiện Trang Sức Nữ" },
  { id: "sac_dep", name: "Sắc Đẹp" },
  { id: "suc_khoe", name: "Sức Khỏe" },
  { id: "the_thao_du_lich", name: "Thể Thao & Du Lịch" },
  { id: "thiet_bi_dien_gia_dung", name: "Thiết Bị Điện Gia Dụng" },
  { id: "thiet_bi_dien_tu", name: "Thiết Bị Điện Tử" },
  { id: "thoi_trang_nam", name: "Thời Trang Nam" },
  { id: "thoi_trang_nu", name: "Thời Trang Nữ" },
  { id: "thoi_trang_tre_em", name: "Thời Trang Trẻ Em" },
  { id: "tui_vi_nu", name: "Túi Ví Nữ" }
];

const AddProduct = () => {
  // --- 1. STATE QUẢN LÝ DỮ LIỆU ---
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    stock: '',
    weight: '',
    length: '',
    width: '',
    height: ''
  });

  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);

  const [hasVariants, setHasVariants] = useState(false);
  const [tiers, setTiers] = useState([{ name: '', options: [] }]);
  const [variantsList, setVariantsList] = useState([]);

  // --- 2. XỬ LÝ SỰ KIỆN CƠ BẢN ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- 3. XỬ LÝ MEDIA (HÌNH ẢNH & VIDEO) ---
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 9) {
      alert("Chỉ được tải lên tối đa 9 ảnh!");
      return;
    }
    const newImages = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert("Video quá lớn. Vui lòng chọn video dưới 100MB.");
        return;
      }
      setVideo({
        file,
        previewUrl: URL.createObjectURL(file)
      });
    }
  };

  const removeVideo = () => setVideo(null);

  // --- 4. LOGIC BIẾN THỂ (VARIANTS) ---
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

  // --- 5. SUBMIT FORM (ĐÃ ĐƯỢC NÂNG CẤP) ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validate Ảnh
    if (images.length < 5) {
      alert("Vui lòng thêm ít nhất 5 ảnh cho sản phẩm!");
      return;
    }

    // 2. Chuẩn bị dữ liệu xử lý Biến thể (SKU)
    let finalPrice = formData.price;
    let finalStock = formData.stock;
    let formattedVariants = [];

    if (hasVariants) {
      // Validate xem người dùng đã nhập đủ giá và kho cho biến thể chưa
      const isVariantsValid = variantsList.every(v => v.price !== '' && v.stock !== '');
      if (!isVariantsValid || variantsList.length === 0) {
        alert("Vui lòng nhập đầy đủ Giá và Số lượng cho tất cả biến thể!");
        return;
      }

      // Lấy biến thể đầu tiên làm thông tin sản phẩm chính
      finalPrice = variantsList[0].price;

      // Về số lượng kho gốc: Thường kho gốc = Tổng kho các biến thể. 
      // Tuy nhiên theo ý bạn, ta gán bằng biến thể đầu tiên luôn:
      finalStock = variantsList[0].stock;

      // Map lại dữ liệu cho khớp với class Product_Variants ở Backend
      formattedVariants = variantsList.map(v => ({
        tier_1_name: tiers[0]?.name || null,
        tier_1_value: v.tier1 || null,
        tier_2_name: tiers[1]?.name || null,
        tier_2_value: v.tier2 || null,
        price: parseFloat(v.price),
        stock: parseInt(v.stock, 10),
        sku_code: v.sku || null // Map từ sku sang sku_code
      }));
    }

    // 3. Khởi tạo FormData
    const formDataToSend = new FormData();

    // 4. Nạp các trường Text (Dữ liệu cơ bản)
    formDataToSend.append('name', formData.name);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('price', finalPrice); // Dùng finalPrice đã xử lý
    formDataToSend.append('stock', finalStock); // Dùng finalStock đã xử lý
    formDataToSend.append('has_variants', hasVariants);

    // Nạp chuỗi JSON chứa danh sách SKU (nếu có biến thể)
    if (hasVariants) {
      formDataToSend.append('variants_data', JSON.stringify(formattedVariants));
    }

    formDataToSend.append('weight', formData.weight || 0);
    formDataToSend.append('length', formData.length || 0);
    formDataToSend.append('width', formData.width || 0);
    formDataToSend.append('height', formData.height || 0);

    // 5. Nạp mảng Hình Ảnh
    images.forEach((img) => {
      formDataToSend.append('images', img.file);
    });

    // 6. Nạp Video
    if (video && video.file) {
      formDataToSend.append('video', video.file);
    }

    // 7. Gửi API
    try {
      const response = await fetch(`http://127.0.0.1:8000/product/add`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('access_token')}`
          // KHÔNG SET 'Content-Type': 'application/json' Ở ĐÂY!
          // Trình duyệt sẽ tự động set 'multipart/form-data' với boundary chuẩn.
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Lỗi khi lưu sản phẩm");
      }

      alert("Thêm sản phẩm thành công!");
      console.log("Kết quả từ server:", data);

      // Tùy chọn: Reset form hoặc chuyển trang sau khi thành công
      // window.location.reload(); 

    } catch (error) {
      console.error("Lỗi:", error);
      alert(error.message);
    }
  };


  return (
    <div className="add-product-container">
      {/* ... SIDEBAR GIỮ NGUYÊN ... */}
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

      <main className="product-main-content">
        <form onSubmit={handleSubmit}>

          {/* ================= SECTION 1: THÔNG TIN CƠ BẢN ================= */}
          <section id="basic-info" className="content-card">
            <h2>Thông tin cơ bản</h2>

            {/* Hình ảnh */}
            <div className="form-group">
              <label className="required">Hình ảnh <span>ℹ️</span></label>
              <p className="hint" style={{ color: images.length < 5 ? 'red' : 'inherit' }}>
                * Bắt buộc thêm ít nhất 5 ảnh (Đã thêm: {images.length}/9)
              </p>

              <div className="image-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {/* Render các ảnh đã chọn */}
                {images.map((img, index) => (
                  <div key={index} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid #ddd' }}>
                    <img src={img.previewUrl} alt={`preview-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                      X
                    </button>
                    {index === 0 && <span style={{ position: 'absolute', bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '10px', padding: '2px', width: '100%', textAlign: 'center' }}>Ảnh chính</span>}
                  </div>
                ))}

                {/* Nút Upload Ảnh */}
                {images.length < 9 && (
                  <label className="upload-box main-img" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', border: '1px dashed #ccc' }}>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} hidden />
                    <div className="icon">📤</div>
                    <span style={{ fontSize: '10px', textAlign: 'center' }}>Thêm ảnh</span>
                  </label>
                )}
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

            {/* Hạng mục (Đã cập nhật theo list ảnh) */}
            <div className="form-group">
              <label className="required">Hạng mục <span>ℹ️</span></label>
              <div className="select-wrapper">
                <select name="category" value={formData.category} onChange={handleChange} required>
                  <option value="" disabled>Chọn hạng mục...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>


          </section>

          {/* ================= SECTION 2: CHI TIẾT SẢN PHẨM ================= */}
          <section id="product-details" className="content-card">
            <h2>Chi tiết sản phẩm</h2>

            <div className="form-group">
              <label className="required">Mô tả</label>
              <div className="editor-container">
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

            {/* Phần Upload Video */}
            <div className="form-group">
              <label>Video <span>ℹ️</span></label>
              <p className="hint">Tỷ lệ khung hình từ 9:16 đến 16:9. Kích thước tối đa 100MB.</p>
              {video ? (
                <div style={{ position: 'relative', width: '200px' }}>
                  <video src={video.previewUrl} controls style={{ width: '100%', borderRadius: '4px' }} />
                  <button
                    type="button"
                    onClick={removeVideo}
                    style={{ position: 'absolute', top: -10, right: -10, background: 'red', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '5px 10px' }}
                  >
                    X
                  </button>
                </div>
              ) : (
                <label className="upload-box video-box" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                  <input type="file" accept="video/*" onChange={handleVideoUpload} hidden />
                  <div className="icon">🎥</div>
                  <span >Thêm Video</span>
                </label>
              )}
            </div>
          </section>
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
            <button type="submit" className="btn-submit">Thêm Sản Phẩm</button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddProduct;

