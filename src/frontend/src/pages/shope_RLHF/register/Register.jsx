import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './style.scss';

const RegisterPage = () => {
    // Quản lý state cho form
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [reEnterPassword, setReEnterPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Dùng ref để focus vào input khi có lỗi
    const reEnterPasswordRef = useRef(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate mật khẩu
        if (reEnterPassword !== password) {
            alert("Xác nhận mật khẩu không đúng");
            if (reEnterPasswordRef.current) {
                reEnterPasswordRef.current.focus();
            }
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:8000/register', {
                method: "POST",
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify({ user_name: username, password: password })
            });

            if (response.ok) {
                alert("Tạo mật khẩu thành công");
                
                // Lưu tạm thông tin để trang Login tự động điền
                sessionStorage.setItem('username', username);
                sessionStorage.setItem('password', password);
                
                // Chuyển hướng sang trang đăng nhập
                navigate('/login');
            } else {
                alert("Chưa điền đủ thông tin hoặc tài khoản đã tồn tại");
            }
        } catch (error) {
            console.error("Register Error:", error);
            alert("Không thể kết nối tới máy chủ!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-wrapper">
            <div className="container">
                <h2>Đăng ký tài khoản</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Tên đăng nhập</label>
                        <input 
                            type="text" 
                            id="username" 
                            placeholder="Nhập tên đăng nhập của bạn" 
                            required 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu</label>
                        <input 
                            type="password" 
                            id="password" 
                            placeholder="Nhập mật khẩu" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="re_enter_password">Nhập lại mật khẩu</label>
                        <input 
                            type="password" 
                            id="re_enter_password" 
                            placeholder="Nhập mật khẩu" 
                            required 
                            value={reEnterPassword}
                            onChange={(e) => setReEnterPassword(e.target.value)}
                            ref={reEnterPasswordRef}
                        />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Đang xử lý..." : "Đăng ký"}
                    </button>
                </form>
                <p className="message">
                    Đã có tài khoản? <Link to="/shope_rlhf/login">Đăng nhập ngay</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;