import axios from 'axios';

const API_URL = 'http://localhost:8000/orders';

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  };
};

export const sellerOrderService = {
  getOrders: async (status = null, skip = 0, limit = 50) => {
    try {
      let url = `${API_URL}/seller/get-orders?skip=${skip}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }
      const response = await axios.get(url, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách đơn hàng:", error);
      throw error;
    }
  },

  updateOrderStatus: async (billId, newStatus) => {
    try {
      const url = `${API_URL}/seller/update-status/${billId}`;
      const response = await axios.put(url, { status: newStatus }, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      throw error;
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/seller/dashboard-stats`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy thống kê dashboard:", error);
      throw error;
    }
  },
};