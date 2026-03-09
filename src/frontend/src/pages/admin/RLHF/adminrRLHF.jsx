import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import './style.scss';

const API_URL = "http://127.0.0.1:8000";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // States
  const [activeTab, setActiveTab] = useState('approval');
  const [tasks, setTasks] = useState({ pending: [], active: [] });
  const [selectedTask, setSelectedTask] = useState(null);
  const [daysLimit, setDaysLimit] = useState(3);
  
  const [conflictTasks, setConflictTasks] = useState([]);
  const [conflictMemberView, setConflictMemberView] = useState({}); // Lưu tab member đang xem { taskIndex: memberIndex }
  const [conflictEdits, setConflictEdits] = useState({}); // Lưu dữ liệu đang sửa { taskIndex: { following: '...', ... } }

  const [userStats, setUserStats] = useState([]);
  const [systemStats, setSystemStats] = useState({ today: { tasks: 0, active_mins: 0 }, month: { tasks: 0, active_mins: 0 } });

  // Init
  useEffect(() => {
    if (localStorage.getItem('auth') !== 'admin') {
      navigate('/login');
      return;
    }
    loadTaskList();
  }, []);

  // Fetch Data Functions
  const loadTaskList = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setTasks({
        pending: data.filter(t => t.status === 'pending'),
        active: data.filter(t => t.status === 'avaiable')
      });
    } catch (e) { console.error(e); }
  };

  const loadTaskDetail = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/${taskId}/detailtask`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedTask(data);
      setDaysLimit(3);
    } catch (e) { console.error(e); }
  };

  const loadConflictTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/conflicts`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setConflictTasks(data);
      
      // Init default view & edits for conflicts
      let initialViews = {};
      let initialEdits = {};
      data.forEach((task, index) => {
        initialViews[index] = 0; // Mặc định xem member 0
        initialEdits[index] = { ...task.results[0] }; 
      });
      setConflictMemberView(initialViews);
      setConflictEdits(initialEdits);
    } catch (e) { console.error(e); }
  };

  const loadStats = async () => {
    try {
      // User Stats
      const resUser = await fetch(`${API_URL}/admin/user-performance`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resUser.ok) setUserStats(await resUser.json());

      // System Stats
      const resSys = await fetch(`${API_URL}/admin/system-stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resSys.ok) {
        const apiData = await resSys.json();
        const sysData = {
          today: { 
            tasks: apiData.today.tasks, 
            active_mins: (apiData.today.active_time / 60).toFixed(1) 
          },
          month: { 
            tasks: apiData.month.tasks, 
            active_mins: (apiData.month.active_time / 60).toFixed(1) 
          }
        };
        setSystemStats(sysData);
        renderChart(sysData);
      }
    } catch (e) { console.error(e); }
  };

  const renderChart = (data) => {
    if (chartInstance.current) chartInstance.current.destroy();
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Hôm nay', 'Tháng này'],
        datasets: [
          {
            label: 'Số Task Hoàn thành',
            data: [data.today.tasks, data.month.tasks],
            backgroundColor: '#2196F3',
            yAxisID: 'y'
          },
          {
            label: 'Thời gian làm (Phút)',
            data: [data.today.active_mins, data.month.active_mins],
            backgroundColor: '#ff9800',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Số lượng Task' } },
          y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Số Phút thực làm' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  };

  // Action Functions
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'stats') loadStats();
    if (tab === 'conflict') loadConflictTasks();
    if (tab === 'approval') loadTaskList();
  };

  const handleTaskAction = async (action) => {
    if (!selectedTask) return;
    if (!confirm(`Bạn chắc chắn muốn ${action === 'approve' ? 'Duyệt' : 'Từ chối'} task này?`)) return;

    if (action === 'approve') {
      try {
        const res = await fetch(`${API_URL}/task/${selectedTask.id}/approve`, {
          method: 'PATCH',
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ deadline: parseInt(daysLimit) })
        });
        if (res.ok) {
          alert("✅ Đã duyệt và cập nhật thời hạn task thành công!");
          setSelectedTask(null);
          loadTaskList();
        } else alert("❌ Lỗi duyệt task");
      } catch (e) { console.error(e); }
    } else {
      const reason = prompt("Nhập lý do từ chối:");
      if (reason === null) return;
      try {
        const res = await fetch(`${API_URL}/task/${selectedTask.id}/reject`, {
          method: 'PATCH',
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ comment: reason || "Admin từ chối yêu cầu" })
        });
        if (res.ok) {
          alert("⚠️ Đã từ chối task.");
          setSelectedTask(null);
          loadTaskList();
        } else alert("❌ Lỗi từ chối task");
      } catch (e) { console.error(e); }
    }
  };

  const handleConflictEditChange = (taskIndex, field, value) => {
    setConflictEdits(prev => ({
      ...prev,
      [taskIndex]: { ...prev[taskIndex], [field]: value }
    }));
  };

  const finalDecide = async (taskId, taskIndex) => {
    if (!confirm("Bạn có chắc chắn chốt dữ liệu này làm Gold Standard không?")) return;
    const payload = conflictEdits[taskIndex];
    try {
      const res = await fetch(`${API_URL}/admin/resolve-conflict/${taskId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("✅ Đã chốt và lưu Final Result thành công!");
        loadConflictTasks();
      } else alert("❌ Lỗi không thể chốt task");
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // --- RENDERS ---
  const renderChat = (messages) => {
    if (!messages || messages.length === 0) return <p className="text-center text-muted">Không có dữ liệu hội thoại.</p>;
    return messages.map((msg, i) => {
      const isAi = msg.role === 'ai';
      return (
        <div key={i} className={`chat-message ${isAi ? 'msg-ai' : 'msg-human'}`}>
          <div className="msg-header">
            <strong>{isAi ? '🤖 AI' : '👤 User'}</strong>
            {msg.created_at && <small style={{marginLeft: '10px'}}>{new Date(msg.created_at).toLocaleString('vi-VN')}</small>}
          </div>
          <div className="msg-body" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br>') }} />
        </div>
      );
    });
  };

  const renderApprovalTab = () => (
    <div className="dashboard-grid">
      <div className="left-column">
        <div className="section">
          <h2>📋 Task Chờ duyệt</h2>
          {tasks.pending.length === 0 ? <p>Không có task chờ duyệt.</p> : tasks.pending.map(item => (
            <div key={item.id} className="item-card cursor-pointer" onClick={() => loadTaskDetail(item.id)}>
              <strong>{item.title}</strong><br />
              <p className="text-muted">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="section mt-20">
          <h2>✅ Task Đã Duyệt (Public)</h2>
          {tasks.active.length === 0 ? <p>Không có task public.</p> : tasks.active.map(item => (
            <div key={item.id} className="item-card border-left-green">
              <strong>{item.title}</strong>
              <span className="status-badge available">Đang chờ User nhận</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="right-column">
        <div className="section">
          <h2>🔍 Chi tiết Feedback</h2>
          {!selectedTask ? (
            <div id="detail-content">Chọn một task...</div>
          ) : (
            <div>
              <div className="task-info-summary">
                <h3>{selectedTask.title}</h3>
                <div className="time-info mb-15">
                  <span>⏱️ <strong>Được đánh giá lúc:</strong> {selectedTask.feedback_at ? new Date(selectedTask.feedback_at).toLocaleString('vi-VN') : '---'}</span>
                </div>
                <p><strong>Trạng thái:</strong> <span className="badge">{selectedTask.status}</span></p>
                <p><strong>AI tự đánh giá:</strong> {selectedTask.agent_sentiment} | <strong>Đánh giá của khách:</strong> {'⭐'.repeat(selectedTask.rating)}</p>
                <div className="error-box">
                  <strong>Nguyên nhân gốc (Root Cause):</strong>
                  <p>{selectedTask.root_cause || 'Đang phân tích...'}</p>
                </div>
                <div className="form-group">
                  <label>Thời hạn (ngày):</label>
                  <input type="number" value={daysLimit} onChange={e => setDaysLimit(e.target.value)} min="1" max="30" className="w-80" />
                </div>
              </div>
              <hr />
              <div className="chat-container">{renderChat(selectedTask.messages)}</div>
              <div className="detail-actions">
                <button className="btn-reject" onClick={() => handleTaskAction('reject')}>❌ Từ chối</button>
                <button className="btn-approve" onClick={() => handleTaskAction('approve')}>✅ Duyệt</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderConflictTab = () => (
    <div className="section">
      <h2>⚖️ So sánh kết quả giữa các Member (Consensus)</h2>
      {conflictTasks.length === 0 ? (
        <p className="text-center text-green p-20">✅ Tuyệt vời! Hiện không có Task nào bị xung đột.</p>
      ) : conflictTasks.map((task, taskIndex) => {
        const activeResIdx = conflictMemberView[taskIndex] || 0;
        const currentEdit = conflictEdits[taskIndex] || task.results[0];

        return (
          <div key={task.id} className="conflict-card">
            <div className="conflict-header">
              <h3>⚠️ Task #{task.id}: {task.title}</h3>
              <span className="conflict-badge">Có {task.results.length}/3 người nộp bài</span>
            </div>
            
            <div className="mb-20">
              <strong className="d-block mb-10">💬 Lịch sử hội thoại (Context):</strong>
              <div className="chat-container conflict-chat">{renderChat(task.messages)}</div>
            </div>

            <strong className="d-block mb-10">⚖️ Đối chiếu kết quả đánh giá:</strong>
            <div className="member-tabs">
              {task.results.map((r, rIndex) => (
                <button key={rIndex} 
                  className={`member-tab-btn ${activeResIdx === rIndex ? 'active' : ''}`}
                  onClick={() => {
                    setConflictMemberView(prev => ({...prev, [taskIndex]: rIndex}));
                    setConflictEdits(prev => ({...prev, [taskIndex]: {...r}}));
                  }}
                >
                  👤 {r.member_name}
                </button>
              ))}
            </div>

            <div className="task-edit-content">
              <div className="active-time-box"><strong>⏱️ Thời gian Member thực làm:</strong> {task.results[activeResIdx].active_time} giây</div>
              <p className="hint-text"><em>* Bạn có thể thay đổi trực tiếp các đánh giá dưới đây trước khi chốt.</em></p>
              
              <div className="eval-grid">
                {['following', 'grounded', 'useful', 'harmful'].map(field => (
                  <div key={field} className="eval-item">
                    <strong>{field.charAt(0).toUpperCase() + field.slice(1)}:</strong>
                    <select value={currentEdit[field] || ''} onChange={e => handleConflictEditChange(taskIndex, field, e.target.value)}>
                      <option value="fully">Fully</option>
                      <option value="partially">Partially</option>
                      <option value="not">Not</option>
                      {field === 'harmful' && <option value="maybe">Maybe</option>}
                    </select>
                  </div>
                ))}
              </div>
              
              <div className="mt-15">
                <strong>✍️ Báo cáo / Cách sửa lỗi:</strong>
                <textarea 
                  value={currentEdit.solution || ''} 
                  onChange={e => handleConflictEditChange(taskIndex, 'solution', e.target.value)}
                  className="solution-textarea"
                />
              </div>
            </div>

            <button className="btn-approve btn-block mt-20" onClick={() => finalDecide(task.id, taskIndex)}>
              ✅ Chốt kết quả dựa trên nội dung đang hiển thị
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderStatsTab = () => (
    <div className="dashboard-grid">
      <div className="section flex-1">
        <h2>🏆 Top Member Hiệu Quả</h2>
        <table>
          <thead className="bg-light">
            <tr>
              <th>Member</th>
              <th>Task Hoàn thành</th>
              <th>Điểm Uy Tín</th>
              <th>Tỉ lệ Tập trung</th>
            </tr>
          </thead>
          <tbody>
            {userStats.length === 0 ? <tr><td colSpan="4" className="text-center p-20">Chưa có dữ liệu</td></tr> : userStats.map((u, i) => {
              const score = u.trust_score || 100;
              const focus = u.focus_rate || 0;
              const scoreColor = score >= 80 ? 'green' : (score >= 50 ? 'orange' : 'red');
              const focusColor = focus >= 80 ? 'green' : 'orange';
              return (
                <tr key={i}>
                  <td><strong>{u.user_name}</strong></td>
                  <td>{u.completed_tasks} tasks</td>
                  <td style={{ color: scoreColor, fontWeight: 'bold' }}>{score}</td>
                  <td style={{ color: focusColor, fontWeight: 'bold' }}>{focus}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="section flex-1">
        <h2>📈 Tổng quan Hệ thống</h2>
        <div style={{ height: '300px', width: '100%' }}>
          <canvas ref={chartRef}></canvas>
        </div>
        <div className="stat-summary-box">
          <div className="stat-item"><h3>{systemStats.today.tasks}</h3><p>Task Hôm nay</p></div>
          <div className="stat-item"><h3>{systemStats.month.tasks}</h3><p>Task Tháng này</p></div>
          <div className="stat-item"><h3>{systemStats.today.active_mins}p</h3><p>Active Hôm nay</p></div>
          <div className="stat-item"><h3>{systemStats.month.active_mins}p</h3><p>Active Tháng này</p></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="header-bar">
        <h1>🛡️ Admin Control Panel</h1>
        <button className="btn-logout" onClick={handleLogout}>Đăng xuất</button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'approval' ? 'active' : ''}`} onClick={() => handleTabChange('approval')}>Duyệt Task đầu vào</button>
        <button className={`tab-btn ${activeTab === 'conflict' ? 'active' : ''}`} onClick={() => handleTabChange('conflict')}>Xử lý Conflict</button>
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => handleTabChange('stats')}>Dashboard Hiệu suất</button>
      </div>

      <div className="tab-content">
        {activeTab === 'approval' && renderApprovalTab()}
        {activeTab === 'conflict' && renderConflictTab()}
        {activeTab === 'stats' && renderStatsTab()}
      </div>
    </div>
  );
};

export default AdminDashboard;