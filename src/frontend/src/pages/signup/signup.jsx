import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerCustomer } from '../../services/customer'; // Import API 
import './style.scss'; // (File CSS bạn dùng lại của bước trước nhé)

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '', reEnterPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    const reEnterPasswordRef = useRef(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.reEnterPassword) {
            alert("Xác nhận mật khẩu không đúng!");
            reEnterPasswordRef.current.focus();
            return;
        }

        setIsLoading(true);

        try {
            // GỌI API TỪ FILE SERVICE
            await registerCustomer(formData.username, formData.password);
            
            alert("Tạo tài khoản thành công! Vui lòng đăng nhập.");
            navigate('/customer/login'); // Chuyển sang trang đăng nhập

        } catch (error) {
            console.error("Lỗi đăng ký:", error);
            alert(error.message); // Hiển thị lỗi do Service ném ra
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="signup-page">
            <div className="container">
                <h2>Đăng ký tài khoản</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Tên đăng nhập</label>
                        <input type="text" id="username" placeholder="Nhập tên đăng nhập" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu</label>
                        <input type="password" id="password" placeholder="Nhập mật khẩu" value={formData.password} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reEnterPassword">Nhập lại mật khẩu</label>
                        <input type="password" id="reEnterPassword" placeholder="Nhập lại mật khẩu" value={formData.reEnterPassword} onChange={handleChange} ref={reEnterPasswordRef} required />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Đang xử lý..." : "Đăng ký"}
                    </button>
                </form>
                <p className="message">Đã có tài khoản? <Link to="/customer/login">Đăng nhập ngay</Link></p>
            </div>
        </div>
    );
};

export default Signup;