import React, { useState } from "react";
import './style.scss';

function Signup() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        // Xóa thông báo lỗi khi người dùng bắt đầu nhập lại
        if (error) setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Kiểm tra khớp mật khẩu
        if (formData.password !== formData.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp!");
            return;
        }

        console.log("Dữ liệu gửi lên Backend (để gửi OTP):", formData);
        // Ở đây bạn sẽ gọi API FastAPI để gửi mail xác thực
        alert("Mã xác thực đã được gửi đến email của bạn!");
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>ĐĂNG KÝ</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email xác thực</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="email@example.com"
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

                    <div className="form-group">
                        <label>Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Nhập lại mật khẩu..."
                        />
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit">Gửi mã xác nhận</button>
                    
                    <div className="footer-links">
                        <span>Đã có tài khoản?   Đăng nhập</span>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Signup;