// src/api/sellerApi.js

const API_URL = "http://127.0.0.1:8000/seller";

export const registerSellerApi = async (sellerData) => {
    // Lấy token từ localStorage (hoặc Redux/Context)
    const token = localStorage.getItem('access_token'); 

    if (!token) {
        throw new Error("Bạn chưa đăng nhập!");
    }

    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Truyền Token vào header để FastAPI xác thực
        },
        body: JSON.stringify(sellerData)
    });

    const data = await response.json();

    if (!response.ok) {
        // Quăng lỗi để component React bắt được (vào khối catch)
        throw new Error(data.detail || "Không thể đăng ký Kênh Người Bán");
    }

    return data;
};

