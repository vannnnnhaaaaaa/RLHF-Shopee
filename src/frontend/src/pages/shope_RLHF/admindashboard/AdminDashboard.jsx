import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto'; // Import Chart.js
import './style.scss';

const API_URL = "http://127.0.0.1:8000";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // States quản lý giao diện
    const [activeTab, setActiveTab] = useState('approval');
    const [pendingTasks, setPendingTasks] = useState([]);
    const [activeTasks, setActiveTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [deadlineDays, setDeadlineDays] = useState(3);
    
    // States Thống kê
    const [userStats, setUserStats] = useState([]);
    const [globalStats, setGlobalStats] = useState(null);

    // States Conflict
    const [conflictTasks, setConflictTasks] = useState([]);

    // 1. Kiểm tra Auth khi vào trang
    useEffect(() => {
        if (localStorage.getItem('auth') !== 'admin') {
            navigate('/login');
        } else {
            loadTasks();
        }
    }, [navigate]);

    // 2. Load dữ liệu khi chuyển Tab
    useEffect(() => {
        if (activeTab === 'stats') {
            loadUserStats();
            loadGlobalSystemStats();
        } else if (activeTab === 'conflict') {
            loadConflictTasks();
        } else if (activeTab === 'approval') {
            loadTasks();
        }
    }, [activeTab]);

    // 3. Vẽ biểu đồ khi có dữ liệu GlobalStats
    useEffect(() => {
        if (activeTab === 'stats' && globalStats && chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Hôm nay', 'Tháng này'],
                    datasets: [
                        {
                            label: 'Số Task Hoàn thành',
                            data: [globalStats.today.tasks, globalStats.month.tasks],
                            backgroundColor: '#2196F3',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Thời gian làm (Phút)',
                            data: [globalStats.today.active_mins, globalStats.month.active_mins],
                            backgroundColor: '#ff9800',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { type: 'linear', position: 'left', title: { display: true, text: 'Số lượng Task' } },
                        y1: { type: 'linear', position: 'right', title: { display: true, text: 'Số Phút thực làm' }, grid: { drawOnChartArea: false } }
                    }
                }
            });
        }
    }, [globalStats, activeTab]);

    // --- CÁC HÀM GỌI API ---
    const loadTasks = async () => {
        try {
            const res = await fetch(`${API_URL}/tasks`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            setPendingTasks(data.filter(t => t.status === 'pending'));
            setActiveTasks(data.filter(t => t.status === 'avaiable')); // Lưu ý: 'avaiable' (chính tả gốc của bạn)
        } catch (e) { console.error(e); }
    };

    const reviewDetail = async (taskId) => {
        try {
            const res = await fetch(`${API_URL}/admin/${taskId}/detailtask`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            console.log(data)
            setSelectedTask(data);
        } catch (e) { console.error(e); }
    };

    const approveTask = async (taskId) => {
        if (!confirm("Bạn chắc chắn muốn Duyệt task này?")) return;
        try {
            const res = await fetch(`${API_URL}/task/${taskId}/approve`, {
                method: 'PATCH',
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ deadline: parseInt(deadlineDays) })
            });
            if (res.ok) {
                alert("✅ Đã duyệt thành công!");
                loadTasks();
                setSelectedTask(null);
            } else {
                alert("❌ Lỗi duyệt task");
            }
        } catch (error) { console.error(error); }
    };

    const rejectTask = async (taskId) => {
        const reason = prompt("Nhập lý do từ chối:");
        if (reason === null) return;
        try {
            const res = await fetch(`${API_URL}/task/${taskId}/reject`, {
                method: 'PATCH',
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ comment: reason || "Admin từ chối yêu cầu" })
            });
            if (res.ok) {
                alert("⚠️ Đã từ chối task.");
                loadTasks();
                setSelectedTask(null);
            }
        } catch (error) { console.error(error); }
    };

    const loadUserStats = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/user-performance`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            setUserStats(data || []);
        } catch (e) { console.error(e); }
    };

    const loadGlobalSystemStats = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/system-stats`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            setGlobalStats({
                today: { tasks: data.today.tasks, active_mins: (data.today.active_time / 60).toFixed(1) },
                month: { tasks: data.month.tasks, active_mins: (data.month.active_time / 60).toFixed(1) }
            });
        } catch (error) { console.error(error); }
    };

    const loadConflictTasks = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/conflicts`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            setConflictTasks(data || []);
        } catch (e) { console.error(e); }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/shope_rlhf/login');
    };

    return (
        <div className="admin-dashboard-wrapper">
            <div className="main-container">
                <div className="header">
                    <h1>🛡️ Admin Control Panel</h1>
                    <button className="btn-logout" onClick={handleLogout}>Đăng xuất</button>
                </div>

                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'approval' ? 'active' : ''}`} onClick={() => setActiveTab('approval')}>Duyệt Task đầu vào</button>
                    <button className={`tab-btn ${activeTab === 'conflict' ? 'active' : ''}`} onClick={() => setActiveTab('conflict')}>Xử lý Conflict</button>
                    <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Dashboard Hiệu suất</button>
                </div>

                {/* TAB 1: DUYỆT TASK */}
                {activeTab === 'approval' && (
                    <div className="tab-content dashboard-grid">
                        <div className="left-column">
                            <div className="section">
                                <h2>📋 Task Chờ duyệt</h2>
                                {pendingTasks.length === 0 ? <p>Không có task chờ duyệt.</p> : pendingTasks.map(item => (
                                    <div key={item.id} className="item-card" onClick={() => reviewDetail(item.id)}>
                                        <strong>{item.title}</strong>
                                        <p style={{ fontSize: '13px', color: '#666' }}>{item.description}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="section">
                                <h2>✅ Task Đã Duyệt (Public)</h2>
                                {activeTasks.map(item => (
                                    <div key={item.id} className="item-card" style={{ borderLeft: '4px solid #2ecc71' }}>
                                        <strong>{item.title}</strong>
                                        <span className="status-badge available" style={{ float: 'right' }}>Đang chờ User nhận</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="right-column">
                            <div className="section">
                                <h2>🔍 Chi tiết Task {selectedTask ? `#${selectedTask.id}` : ''}</h2>
                                {!selectedTask ? <p>Chọn một task bên trái để xem chi tiết...</p> : (
                                    <div>
                                        <h3>{selectedTask.title}</h3>
                                        <p><strong>Trạng thái:</strong> {selectedTask.status}</p>
                                        <p><strong>AI tự đánh giá:</strong> {selectedTask.agent_sentiment} | <strong>Đánh giá KH:</strong> {'⭐'.repeat(selectedTask.rating || 0)}</p>
                                        
                                        {/* Root Causes Section */}
                                        <div style={{ background: '#fff5f5', padding: '15px', border: '1px dashed #ff4d4f', color: '#d32f2f', marginBottom: '15px', borderRadius: '5px' }}>
                                            <strong>📌 Nguyên nhân gốc từ AI:</strong>
                                            <p style={{ marginTop: '8px' }}>{selectedTask.root_cause_by_ai || 'Đang phân tích...'}</p>
                                            
                                            {selectedTask.root_cause_by_human && (
                                                <>
                                                    <strong style={{ marginTop: '12px', display: 'block' }}>👤 Nguyên nhân từ Người dùng:</strong>
                                                    <p style={{ marginTop: '8px' }}>{selectedTask.root_cause_by_human}</p>
                                                </>
                                            )}
                                        </div>

                                        {/* Customer Comment Section */}
                                        {selectedTask.comment && (
                                            <div style={{ background: '#fffbf0', padding: '15px', border: '1px dashed #fa8c16', color: '#ad6800', marginBottom: '15px', borderRadius: '5px' }}>
                                                <strong>💬 Bình luận / Phản hồi từ khách hàng:</strong>
                                                <div style={{ 
                                                    marginTop: '10px', 
                                                    padding: '12px', 
                                                    background: '#fff7e6',
                                                    borderLeft: '4px solid #fa8c16',
                                                    borderRadius: '3px',
                                                    fontSize: '14px',
                                                    lineHeight: '1.6',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-wrap',
                                                    maxHeight: '200px',
                                                    overflowY: 'auto'
                                                }}>
                                                    {selectedTask.comment}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div style={{ marginTop: '15px' }}>
                                            <label>Thời hạn hoàn thành (ngày): </label>
                                            <input type="number" value={deadlineDays} onChange={e => setDeadlineDays(e.target.value)} min="1" max="30" style={{ padding: '5px', width: '60px' }} />
                                        </div>
                                        
                                        <div className="chat-container" style={{ marginTop: '20px' }}>
                                            {selectedTask.messages?.map((msg, i) => (
                                                <div key={i} className={`chat-message ${msg.role === 'ai' ? 'msg-ai' : 'msg-human'}`}>
                                                    <strong>{msg.role === 'ai' ? '🤖 AI' : '👤 User'}</strong>
                                                    <div dangerouslySetInnerHTML={{ __html: (msg.content || "").replace(/\n/g, '<br>') }} />
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                            <button className="btn-danger" style={{ flex: 1 }} onClick={() => rejectTask(selectedTask.id)}>❌ Từ chối</button>
                                            <button className="btn-success" style={{ flex: 1 }} onClick={() => approveTask(selectedTask.id)}>✅ Duyệt hoàn thành</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: XỬ LÝ CONFLICT */}
                {activeTab === 'conflict' && (
                    <div className="tab-content">
                        <div className="section">
                            <h2>⚖️ So sánh kết quả giữa các Member</h2>
                            {conflictTasks.length === 0 ? (
                                <p style={{ color: '#2ecc71', textAlign: 'center' }}>✅ Tuyệt vời! Hiện không có Task nào bị xung đột.</p>
                            ) : (
                                conflictTasks.map((task) => (
                                    <div key={task.id} style={{ border: '2px solid #ff9800', marginBottom: '20px', padding: '20px', borderRadius: '8px' }}>
                                        <h3>⚠️ Task #{task.id}: {task.title} (Có {task.results.length}/3 người nộp bài)</h3>
                                        {/* Phần này ở HTML cũ của bạn sử dụng generateMemberDetailHTML phức tạp. 
                                            Để rút gọn, mình có thể tạo Component con, nhưng hiện tại giữ cấu trúc đơn giản để bạn xem luồng */}
                                        <p style={{ color: '#999' }}>*Giao diện review chi tiết từng member đang được xử lý ở bước sau*</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: THỐNG KÊ */}
                {activeTab === 'stats' && (
                    <div className="tab-content dashboard-grid">
                        <div className="section" style={{ flex: 1 }}>
                            <h2>🏆 Top Member Hiệu Quả</h2>
                            <table>
                                <thead>
                                    <tr><th>Member</th><th>Task Xong</th><th>Điểm Uy Tín</th><th>Tỉ lệ Tập trung</th></tr>
                                </thead>
                                <tbody>
                                    {userStats.length === 0 ? <tr><td colSpan="4">Chưa có dữ liệu</td></tr> : userStats.map((u, i) => (
                                        <tr key={i}>
                                            <td><strong>{u.user_name}</strong></td>
                                            <td>{u.completed_tasks} tasks</td>
                                            <td style={{ color: u.trust_score >= 80 ? 'green' : 'red', fontWeight: 'bold' }}>{u.trust_score || 100}</td>
                                            <td style={{ color: u.focus_rate >= 80 ? 'green' : 'orange' }}>{u.focus_rate || 0}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="section" style={{ flex: 1 }}>
                            <h2>📈 Tổng quan Hệ thống</h2>
                            <div style={{ height: '300px', width: '100%' }}>
                                <canvas ref={chartRef}></canvas>
                            </div>
                            {globalStats && (
                                <div className="stat-summary-box">
                                    <div className="stat-item"><h3>{globalStats.today.tasks}</h3><p>Task Hôm nay</p></div>
                                    <div className="stat-item"><h3>{globalStats.month.tasks}</h3><p>Task Tháng này</p></div>
                                    <div className="stat-item"><h3>{globalStats.today.active_mins}m</h3><p>Active Hôm nay</p></div>
                                    <div className="stat-item"><h3>{globalStats.month.active_mins}m</h3><p>Active Tháng này</p></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;