const API_BASE_URL = "http://127.0.0.1:8000/customer";

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