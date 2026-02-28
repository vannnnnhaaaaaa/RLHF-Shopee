import React, { useState } from "react";
import './style.scss';

function LoginPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Logic gọi API đăng nhập sang Backend Python (FastAPI) sẽ đặt ở đây
        console.log("Đang đăng nhập với:", formData);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>ĐĂNG NHẬP</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email / Tên đăng nhập</label>
                        <input
                            type="email"
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

                    <button type="submit">Đăng nhập</button>
                    
                    <div className="footer-links">
                        <p>Mới biết đến Shopee? <span>  Đăng ký</span></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;