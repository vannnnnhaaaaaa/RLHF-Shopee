import axios from 'axios';

const API_URL = 'http://localhost:8000';
const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  };
};

const purchase_customer_service = {
  // Thêm page và limit vào tham số, mặc định page = 1, limit = 7
  getOrderStatus: async (status = 'All', page = 1, limit = 7) => {
    try {
      // Gắn query parameters vào URL
      const url = `${API_URL}/orders/customer/get-status/${status}?page=${page}&limit=${limit}`;

      const response = await axios.get(url, getAuthHeader());
      console.log('Dữ liệu lấy về:', response.data);
      
      // QUAN TRỌNG: Chỉ trả về response.data (danh sách mảng)
      return response.data; 
    } catch (error) {
      console.error('Lỗi lấy danh sách:', error);
      throw error;
    }
  }
};

export default purchase_customer_service;