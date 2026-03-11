const API_BASE_URL = "http://127.0.0.1:8000/customer";

import axios from 'axios';
// Hàm gọi API Đăng ký
export const registerCustomer = async (username, password) => {
    // SỬA: Dùng FormData thay vì JSON
    const formData = new FormData();
    formData.append("user_name", username); 
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        // LƯU Ý: Không được set "Content-Type" khi gửi FormData, 
        // trình duyệt sẽ tự động thiết lập Content-Type với boundary phù hợp.
        body: formData 
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Đăng ký thất bại");
    }

    return data;
};

// Hàm gọi API Đăng nhập
export const loginCustomer = async (username, password) => {
    // SỬA: Dùng FormData thay vì JSON
    const formData = new FormData();
    formData.append("user_name", username); 
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        body: formData 
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Đăng nhập thất bại");
    }

    return data;
};





const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
});

export const userService = {
  // Lấy thông tin cá nhân
  getProfile: async () => {
    const response = await axios.get(`${API_URL}/profile`, getAuthHeader());
    return response.data;
  },

  // Cập nhật thông tin cá nhân
  updateProfile: async (profileData) => {
    console.log(profileData)
    const response = await axios.patch(`${API_URL}/update-profile`, profileData, getAuthHeader());
    return response.data;
  }
};