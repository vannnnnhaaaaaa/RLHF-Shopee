import axios from 'axios';

const API_URL = 'http://localhost:8000/orders'; // Updated to use orders API

// Hàm lấy token từ localStorage
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
  // Lấy danh sách đơn hàng của Seller
  getOrders: async (status = null, skip = 0, limit = 50) => {
    try {
      let url = `${API_URL}/seller/get-orders?skip=${skip}&limit=${limit}`;
      
      // Vì React component đã truyền thẳng chuỗi tiếng Anh (pending, accept...)
      // Nên ta chỉ cần nối chuỗi trực tiếp, không cần dùng statusMap nữa.
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

  // Cập nhật trạng thái đơn hàng
  updateOrderStatus: async (billId, newStatus) => {
    try {
        // Đã thêm API_URL vào đầu
        const url = `${API_URL}/seller/update-status/${billId}`;
        const data = {
            status: newStatus
        };

        // Chuyển từ axios.post thành axios.put cho đúng chuẩn Update
        const response = await axios.put(url, data, getAuthHeader());
        return response.data;
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái:", error);
        throw error;
    }
  },

  // lấy dánh sách đơn hàng của Customer 
  
};