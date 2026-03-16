import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginCustomer } from "../../services/customer";
import './style.scss';
import Footer from "../../components/Footer";

function LoginPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    
    // Thêm state để nhận biết đang ở trang nào và hiển thị lỗi
    const [isSellerLogin, setIsSellerLogin] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const navigate = useNavigate();
    const location = useLocation();

    // Hook này chạy mỗi khi URL thay đổi để check xem có phải trang seller không
    useEffect(() => {
        if (location.pathname.includes('seller-login')) {
            setIsSellerLogin(true);
        } else {
            setIsSellerLogin(false);
        }
    }, [location]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        setErrorMsg(""); // Xóa dòng thông báo lỗi khi user gõ lại thông tin
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await loginCustomer(formData.email, formData.password);
            const accessToken = response.access_token;
            console.log(response);
            
            // Backend trả về auth ('member' hoặc 'admin') và has_shop (true/false)
            const userRole = response.auth; 
            const hasShop = response.has_shop; 
            
            localStorage.setItem('access_token', accessToken);
          
            // Logic điều hướng dựa trên URL hiện tại
            if (isSellerLogin) {
                if (userRole === 'customer') {
                    if (hasShop) {
                        // Đã có id trong bảng Seller -> Chuyển thẳng vào trang quản lý bán hàng
                        navigate('/seller-dashboard');
                    } else {
                        // Chưa có trong bảng Seller -> Chuyển sang trang đăng ký trở thành nhà bán hàng
                        navigate('/become-seller');
                    }
                } else if (userRole === 'admin') {
                    // (Tùy chọn) Xử lý riêng nếu Admin cố tình đăng nhập qua link seller
                    navigate('/admin/dashboard'); 
                }
            } else {
                // Đăng nhập luồng buyer bình thường qua /login
                navigate('/customer');
            }

        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            setErrorMsg("Email hoặc mật khẩu không chính xác!");
        }
    };
    const handleSignup = ()=>{
        navigate('/customer/signup');
    }
    return (
        <>
            <div className="login-container">
                <div className="login-card">
                    {/* Đổi Title động theo URL để UI tái sử dụng tốt hơn */}
                    <h2>{isSellerLogin ? "ĐĂNG NHẬP KÊNH NGƯỜI BÁN" : "ĐĂNG NHẬP"}</h2>
                    
                    {/* Hiển thị lỗi nếu có */}
                    {errorMsg && <div className="error-message" style={{ color: 'red', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{errorMsg}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email / Tên đăng nhập</label>
                            <input
                                type="text"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Nhập email của bạn..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Mật khẩu</label>
                            <input
                                type="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Nhập mật khẩu..."
                            />
                        </div>

                        <div className="options-link">
                            <span>Quên mật khẩu?</span>
                        </div>

                        <button type="submit">{isSellerLogin ? "Vào Cửa Hàng" : "Đăng nhập"}</button>
                        
                        <div className="footer-links">
                            <p>Mới biết đến ứng dụng? <span onClick={handleSignup}> Đăng ký</span></p>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </>
    );
}

export default LoginPage;