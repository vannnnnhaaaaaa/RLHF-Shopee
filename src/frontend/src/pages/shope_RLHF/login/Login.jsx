import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './style.scss';

const LoginPage = () => {
    // 1. Quản lý State thay vì document.getElementById
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    // 2. Tương đương với window.onload
    useEffect(() => {
        const storedUsername = sessionStorage.getItem('username');
        const storedPassword = sessionStorage.getItem('password');

        if (storedUsername && storedPassword) {
            setUsername(storedUsername);
            setPassword(storedPassword);
        }

        // Clear sau khi đã tự điền
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('password');
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Bật hiệu ứng loading vô hiệu hóa nút
        setIsLoading(true);

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch('http://127.0.0.1:8000/login', {
                method: 'POST',
                headers: {
                    "Content-Type": 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('auth', data.auth);

                // Chuyển trang bằng React Router thay vì window.location
                if (data.auth === 'admin') {
                    navigate('/shope_rlhf/admin-dashboard');
                } else {
                    navigate('/shope_rlhf/member-dashboard');
                }
            } else {
                let errorMsg = "Sai tài khoản hoặc mật khẩu!";
                if (data.detail) {
                    errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
                }
                alert(errorMsg);
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("Không thể kết nối tới máy chủ!");
        } finally {
            // Tương đương với hàm resetButton() của bạn
            setIsLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-container">
                <h2>Đăng Nhập</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Tên đăng nhập</label>
                        <input
                            type="text"
                            id="username"
                            placeholder="Nhập tài khoản"
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
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? "Đang xác thực..." : "Đăng Nhập"}
                    </button>
                </form>
                <div className="footer-text">
                    Chưa có tài khoản? <Link to="/shope_rlhf/register">Đăng ký ngay</Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;