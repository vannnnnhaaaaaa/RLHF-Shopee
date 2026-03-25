import axios from 'axios';

const API_URL = 'http://localhost:8000/notifications';

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

export const notificationService = {
  // Lấy danh sách thông báo của user hiện tại
  getMyNotifications: async (skip = 0, limit = 20) => {
    try {
      const response = await axios.get(`${API_URL}/my-notifications?skip=${skip}&limit=${limit}`, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy thông báo:", error);
      throw error;
    }
  },

  // Đánh dấu tất cả thông báo là đã đọc
  markAllAsRead: async () => {
    try {
      const response = await axios.put(`${API_URL}/mark-all-read`, {}, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error("Lỗi khi đánh dấu đã đọc:", error);
      throw error;
    }
  },

  // Đánh dấu một thông báo cụ thể là đã đọc
  markAsRead: async (notificationId) => {
    try {
      const response = await axios.put(`${API_URL}/${notificationId}/mark-read`, {}, getAuthHeader());
      return response.data;
    } catch (error) {
      console.error("Lỗi khi đánh dấu đã đọc:", error);
      throw error;
    }
  }
};