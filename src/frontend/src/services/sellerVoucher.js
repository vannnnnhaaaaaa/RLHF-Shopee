import axios from 'axios';

const API_URL = 'http://localhost:8000/seller/vouchers';

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
};

export const sellerVoucherService = {
  /**
   * Lấy danh sách voucher của seller (có phân trang)
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<{status, data, metadata}>}
   */
  getVouchers: async (limit = 10, offset = 0) => {
    try {
      const response = await axios.get(
        `${API_URL}/list?limit=${limit}&offset=${offset}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách voucher:', error);
      throw error;
    }
  },

  /**
   * Tạo voucher mới
   * @param {object} voucherData
   * @returns {Promise<{status, message, data}>}
   */
  createVoucher: async (voucherData) => {
    try {
      const response = await axios.post(
        `${API_URL}/create`,
        voucherData,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.detail || 'Tạo voucher thất bại.';
      console.error('Lỗi khi tạo voucher:', message);
      throw new Error(message);
    }
  },

  /**
   * Toggle trạng thái is_active của voucher
   * @param {number} voucherId
   * @returns {Promise<{status, message, data}>}
   */
  toggleVoucher: async (voucherId) => {
    try {
      const response = await axios.put(
        `${API_URL}/${voucherId}/toggle`,
        {},
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.detail || 'Cập nhật trạng thái thất bại.';
      console.error('Lỗi khi toggle voucher:', message);
      throw new Error(message);
    }
  },
};
