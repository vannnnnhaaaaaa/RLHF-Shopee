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
    const response = await axios.get(`${API_BASE_URL}/profile`, getAuthHeader());
    console.log(response.data.data)
    return response.data.data;
  },

  // Cập nhật thông tin cá nhân
  updateProfile: async (profileData) => {

    const token = localStorage.getItem('access_token'); 
    // Log ra để chắc chắn token lấy lên được, không bị null hay undefined
    console.log("🔑 Token lấy được từ local:", token); 

    // 2. Tự tay cấu hình config cho Axios
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Nhớ có dấu cách sau chữ Bearer
      }
    };

    try {
      // 3. Gọi API với 3 tham số rõ ràng: URL, Data, và Config
      const response = await axios.patch(`${API_BASE_URL}/updateprofile`, profileData, config);
      return response.data;
    } catch (error) {
      console.error("❌ Lỗi khi gọi API updateProfile:", error);
      throw error;
    }
  }
};