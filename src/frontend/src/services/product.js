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
    // Lấy token từ localStorage (hoặc nơi bạn lưu auth)
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