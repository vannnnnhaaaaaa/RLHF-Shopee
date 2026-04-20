import axios from 'axios';

// Đặt base URL của backend vào đây
const API_URL = 'http://localhost:8000'; 

/**
 * Gọi API lấy danh sách sản phẩm theo trạng thái
 * @param {string} status - Trạng thái (pending_inbound, active, removed...)
 * @param {number} skip - Bỏ qua bao nhiêu cái (phân trang)
 * @param {number} limit - Lấy tối đa bao nhiêu cái
 */
export const getMyProducts = async (status = '', skip = 0, limit = 50) => {
  try {
    // Lấy token từ localStorage
    const token = localStorage.getItem('access_token'); 

    // Gọi API với query parameters
    const response = await axios.get(`${API_URL}/product/list`, {
      params: { 
        status: status === 'all' ? null : status, // Nếu là 'all' thì không gửi status để backend lấy tất cả
        skip: skip,
        limit: limit
      },
      headers: {
        Authorization: `Bearer ${token}`, // Bắt buộc phải có token để backend biết ai đang gọi
      }
    });

    return response.data; 
  } catch (error) {
    console.error("Lỗi khi call API getMyProducts:", error);
    throw error; // Quăng lỗi lại để UI xử lý (hiện thông báo)
  }
};

/**
 * Gọi API tạo sản phẩm mới (Hỗ trợ biến thể, upload hình ảnh và video)
 * @param {Object} payload - Chứa formData cơ bản, biến thể, mảng images và video
 */
export const create_new_product = async (payload) => {
  const { formData, hasVariants, variantsList, tiers, images, video } = payload;
  console.log(payload)
  const token = localStorage.getItem('access_token');
  const formDataToSend = new FormData();

  // 1. Nạp dữ liệu cơ bản
  formDataToSend.append('name', formData.name);
  formDataToSend.append('category', formData.category);
  formDataToSend.append('description', formData.description);
  formDataToSend.append('has_variants', hasVariants);
  
  formDataToSend.append('weight', formData.weight || 0);
  formDataToSend.append('length', formData.length || 0);
  formDataToSend.append('width', formData.width || 0);
  formDataToSend.append('height', formData.height || 0);

  // 2. Xử lý Logic Biến thể (SKU)
  if (hasVariants) {
      const formattedVariants = variantsList.map(v => ({
          tier_1_name: tiers[0]?.name || null,
          tier_1_value: v.tier1 || null,
          tier_2_name: tiers[1]?.name || null,
          tier_2_value: v.tier2 || null,
          price: parseFloat(v.price),
          stock: parseInt(v.stock, 10),
          sku_code: v.sku || null
      }));
      // Backend mong đợi tên trường là 'variantsList'
      formDataToSend.append('variantsList', JSON.stringify(formattedVariants)); 
      
      // Lấy giá và kho của biến thể đầu tiên làm thông tin chung cho sản phẩm
      formDataToSend.append('price', variantsList[0].price);
      formDataToSend.append('stock', variantsList[0].stock);
  } else {
      formDataToSend.append('price', formData.price);
      formDataToSend.append('stock', formData.stock);
  }

  // 3. Nạp mảng Hình Ảnh
  images.forEach((img) => {
      formDataToSend.append('images', img.file);
  });

  // 4. Nạp Video (nếu có)
  if (video && video.file) {
      formDataToSend.append('video', video.file);
  }

  try {
      const response = await axios.post(`${API_URL}/product/add`, formDataToSend, {
          headers: {
              'Authorization': `Bearer ${token}`
            
          }
      });
      return response.data;
  } catch (error) {
      const message = error.response?.data?.detail || "Lỗi khi lưu sản phẩm";
      throw new Error(message);
  }
};

// Thêm vào src/services/product.js
export const get_product_detail = async (productId) => {
  const token = localStorage.getItem('access_token');
  try {
    // Gọi đúng vào API /seller/{id} mới tạo
    const response = await axios.get(`${API_URL}/product/seller/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
    throw error;
  }
};

/**
 * Ghi nhận lượt xem sản phẩm (chống spam F5 bằng sessionStorage).
 * Chỉ gọi API 1 lần duy nhất cho mỗi lần mở tab/trang.
 */
export const trackProductView = async (productId) => {
  const storageKey = `viewed_product_${productId}`;

  if (sessionStorage.getItem(storageKey)) {
    return; // Đã xem rồi → không gọi lại
  }

  try {
    await axios.post(`${API_URL}/product/${productId}/view`);
    sessionStorage.setItem(storageKey, '1');
  } catch (error) {
    console.warn('Không thể ghi nhận lượt xem:', error);
  }
};
export const update_product = async (productId, payload) => {
  // Đã thêm biến 'tiers' vào đây
  const { formData, hasVariants, variantsList, tiers, newImages, existingImages, video } = payload;
  const token = localStorage.getItem('access_token');
  const formDataToSend = new FormData();

  formDataToSend.append('name', formData.name);
  formDataToSend.append('category', formData.category);
  formDataToSend.append('description', formData.description);
  formDataToSend.append('has_variants', hasVariants);
  formDataToSend.append('weight', formData.weight || 0);
  formDataToSend.append('length', formData.length || 0);
  formDataToSend.append('width', formData.width || 0);
  formDataToSend.append('height', formData.height || 0);

  if (hasVariants) {
      formDataToSend.append('variantsList', JSON.stringify(variantsList)); 
      // [THÊM MỚI]: Gửi kèm Tiers (Màu sắc, kích thước...) lên Backend
      formDataToSend.append('tiersList', JSON.stringify(tiers)); 

      formDataToSend.append('price', variantsList[0].price);
      formDataToSend.append('stock', variantsList[0].stock);
  } else {
      formDataToSend.append('price', formData.price);
      formDataToSend.append('stock', formData.stock);
  }

  formDataToSend.append('existingImages', JSON.stringify(existingImages));

  if (newImages && newImages.length > 0) {
      newImages.forEach((img) => formDataToSend.append('newImages', img.file));
  }

  if (video && !video.isExisting && video.file) {
      formDataToSend.append('video', video.file);
  }

  try {
      const response = await axios.put(`${API_URL}/product/edit/${productId}`, formDataToSend, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
  } catch (error) {
      const message = error.response?.data?.detail || "Lỗi khi cập nhật sản phẩm";
      throw new Error(message);
  }
};

/**
 * Lấy 4 chỉ số tổng quan cho Seller Dashboard.
 */
export const getSellerOverview = async () => {
  const token = localStorage.getItem('access_token');
  try {
    const response = await axios.get(`${API_URL}/seller/analytics/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi getSellerOverview:', error);
    throw error;
  }
};

/**
 * Tính số tiền được giảm khi áp dụng voucher cho các sản phẩm đã tick của 1 shop.
 */
export const calculateShopDiscount = (shopItems, selectedIds, voucher) => {
  if (!voucher) return 0;

  const selectedItems = shopItems.filter(item => selectedIds.includes(item.cart_id));
  if (selectedItems.length === 0) return 0;

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  const minSpend = voucher.min_spend || 0;
  if (subtotal < minSpend) return 0;

  let discount = 0;
  if (voucher.discount_type === 'fixed') {
    discount = Math.min(voucher.discount_value || 0, subtotal);
  } else if (voucher.discount_type === 'percent') {
    const rawDiscount = subtotal * ((voucher.discount_value || 0) / 100);
    const maxDiscount = voucher.max_discount || Infinity;
    discount = Math.min(rawDiscount, maxDiscount);
  }

  return Math.floor(discount);
};