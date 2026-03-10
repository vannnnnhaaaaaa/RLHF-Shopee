import axios from 'axios';

const API_URL = 'http://localhost:8000/cart';

// Cấu hình header kèm Token (Lấy từ localStorage hoặc context)
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const getMyCart = async () => {
  try {
    const response = await axios.get(`${API_URL}/my-cart`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Lỗi lấy giỏ hàng:", error);
    throw error;
  }
};

export const updateQuantity = async (cartItemId, newQuantity) => {
  try {
    const response = await axios.put(`${API_URL}/update/${cartItemId}`, { quantity: newQuantity }, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Lỗi cập nhật số lượng:", error);
    throw error;
  }
};

export const removeCartItem = async (cartItemId) => {
  try {
    const response = await axios.delete(`${API_URL}/remove/${cartItemId}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error("Lỗi xóa sản phẩm:", error);
    throw error;
  }
};