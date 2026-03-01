import axios from 'axios';

const API_URL = 'http://localhost:8000'; // Cổng chạy FastAPI của bạn

// Hàm gọi API Đăng nhập
export const loginApi = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); 
    formData.append('password', password);

    // 2. Gửi đi với Header tương ứng
    const response = await axios.post('http://127.0.0.1:8000/login', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data;
};