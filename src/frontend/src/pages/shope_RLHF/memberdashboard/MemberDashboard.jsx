import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.scss';

const API_URL = "http://127.0.0.1:8000";

const MemberDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Tự động load data khi vào trang
    useEffect(() => {
        loadAvailableTasks();
    }, []);

    const loadAvailableTasks = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/available`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Xử lý lỗi Token hết hạn hoặc sai quyền (403 Forbidden)
            if (response.status === 401 || response.status === 403) {
                alert("Phiên đăng nhập hết hạn hoặc bạn không có quyền!");
                localStorage.clear();
                navigate('/login');
                return;
            }

            if (!response.ok) {
                throw new Error("Lỗi khi tải dữ liệu");
            }

            const data = await response.json();
            setTasks(data);
        } catch (err) {
            console.error(err);
            setError("❌ Lỗi kết nối server!");
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm tính toán logic hiển thị Deadline (Giữ nguyên logic cũ của bạn)
    const getDeadlineInfo = (deadlineString) => {
        const now = new Date();
        const deadline = new Date(deadlineString);
        const diffInMs = deadline - now;

        const totalMinutes = Math.floor(diffInMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (diffInMs < 0) {
            // Quá hạn -> Badge Đỏ, Viền Đỏ
            return { text: "⚠️ ĐÃ QUÁ HẠN", color: "#e74c3c", borderColor: "#e74c3c" };
        } else if (hours < 24) {
            // Dưới 24h -> Badge Cam, Viền Cam
            return { text: `⏳ Còn ${hours}h ${minutes}p`, color: "#f39c12", borderColor: "#f39c12" };
        } else {
            // Còn nhiều thời gian -> Badge Xanh lá, Viền Xanh dương
            const days = Math.floor(hours / 24);
            return { text: `📅 Còn ${days} ngày`, color: "#2ecc71", borderColor: "#3498db" };
        }
    };

    const startTask = (taskId) => {
        navigate(`/shope_rlhf/work/${taskId}`);  // ✅ Relative path - more reliable within nested routes
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/shope_rlhf/login');
    };

    return (
        <div className="member-dashboard-wrapper">
            <div className="container">
                <div className="header">
                    <div>
                        <h2>📋 Công việc của bạn</h2>
                        <p>Chào mừng bạn quay lại!</p>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
                </div>

                {/* Xử lý 3 trạng thái: Loading, Lỗi, và Đã có data */}
                {isLoading ? (
                    <p style={{ textAlign: 'center' }}>Đang tải công việc...</p>
                ) : error ? (
                    <div className="error-state">{error}</div>
                ) : tasks.length === 0 ? (
                    <div className="empty-state">
                        ☕ Hiện tại bạn không có task nào được giao.
                    </div>
                ) : (
                    <div className="task-list">
                        {tasks.map(task => {
                            const timeInfo = getDeadlineInfo(task.deadline);
                            return (
                                <div
                                    key={task.id}
                                    className="task-card"
                                    style={{ borderLeftColor: timeInfo.borderColor }}
                                >
                                    <div className="task-info">
                                        <div
                                            className="status-badge"
                                            style={{ backgroundColor: timeInfo.color }}
                                        >
                                            {timeInfo.text}
                                        </div>
                                        <h3>{task.title}</h3>
                                        <p>{task.description || 'Không có mô tả'}</p>
                                    </div>
                                    <div className="task-action">
                                        <button
                                            className="btn-primary"
                                            onClick={() => startTask(task.id)}
                                        >
                                            🚀 Làm ngay
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemberDashboard;