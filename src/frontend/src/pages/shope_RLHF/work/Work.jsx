import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './style.scss';

const API_URL = "http://127.0.0.1:8000";

const WorkPage = () => {
    const navigate = useNavigate();
    const { id: taskId } = useParams();  // ✅ Lấy taskId từ URL path (vd: /work/123)
    const token = localStorage.getItem('token');

    const [task, setTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- STATES CHO FORM ĐÁNH GIÁ ---
    const [evalForm, setEvalForm] = useState({
        following: '',
        grounded: '',
        useful: '',
        harmful: '',
        solution: ''
    });

    // --- STATES CHO BỘ ĐẾM (TIMER) ---
    const [activeSeconds, setActiveSeconds] = useState(0);
    const [idleSeconds, setIdleSeconds] = useState(0);
    const [isIdle, setIsIdle] = useState(false);
    
    // Dùng useRef để lưu counter mà không kích hoạt re-render
    const idleCheckCounter = useRef(0);
    const timerInterval = useRef(null);

    // 1. Khởi tạo Timer và Event Listeners
    useEffect(() => {
        const resetIdleTrigger = () => {
            idleCheckCounter.current = 0;
            setIsIdle(false);
        };

        // Lắng nghe tương tác người dùng
        window.addEventListener('mousemove', resetIdleTrigger);
        window.addEventListener('keypress', resetIdleTrigger);
        window.addEventListener('click', resetIdleTrigger);
        window.addEventListener('scroll', resetIdleTrigger);

        // Bắt đầu đếm mỗi giây
        timerInterval.current = setInterval(() => {
            idleCheckCounter.current += 1;

            if (idleCheckCounter.current >= 7) {
                // Sau 7s không tương tác
                setIsIdle(true);
                setIdleSeconds(prev => prev + 1);
            } else {
                // Đang tương tác
                setIsIdle(false);
                setActiveSeconds(prev => prev + 1);
            }
        }, 1000);

        // Cleanup function: Tắt bộ đếm khi rời khỏi trang
        return () => {
            clearInterval(timerInterval.current);
            window.removeEventListener('mousemove', resetIdleTrigger);
            window.removeEventListener('keypress', resetIdleTrigger);
            window.removeEventListener('click', resetIdleTrigger);
            window.removeEventListener('scroll', resetIdleTrigger);
        };
    }, []);

    // 2. Load Dữ liệu Task
    useEffect(() => {
        if (!taskId || !token) {
            navigate('/shope_rlhf/member-dashboard');  // ✅ Đường dẫn đầy đủ
            return;
        }

        const fetchTask = async () => {
            try {
                const res = await fetch(`${API_URL}/${taskId}/detailtask`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Lỗi khi lấy dữ liệu từ Server");
                const data = await res.json();
                setTask(data);
            } catch (error) {
                alert("Lỗi: " + error.message);
                navigate('/shope_rlhf/member-dashboard');  // ✅ Đường dẫn đầy đủ
            } finally {
                setIsLoading(false);
            }
        };

        fetchTask();
    }, [taskId, token, navigate]);

    // 3. Xử lý thay đổi Form
    const handleRadioChange = (e) => {
        setEvalForm({ ...evalForm, [e.target.name]: e.target.value });
    };

    const handleTextareaChange = (e) => {
        setEvalForm({ ...evalForm, solution: e.target.value });
    };

    // 4. Submit Task
    const submitTask = async () => {
        const { following, grounded, useful, harmful, solution } = evalForm;

        if (!following || !grounded || !useful || !harmful || !solution.trim()) {
            alert("⚠️ Vui lòng hoàn thành đánh giá (đủ 4 mục) và nhập báo cáo!");
            return;
        }

        setIsSubmitting(true);
        const totalSeconds = activeSeconds + idleSeconds;

        const payload = {
            following,
            grounded,
            useful,
            harmful,
            solution,
            active_time: activeSeconds,
            idle_time: idleSeconds,
            total_time: totalSeconds
        };

        try {
            const res = await fetch(`${API_URL}/updateTask/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                alert("✅ Nộp bài đánh giá thành công!");
                navigate('/shope_rlhf/member-dashboard');
            } else {
                const errData = await res.json();
                alert("❌ Lỗi: " + (errData.detail || "Không thể nộp bài."));
            }
        } catch (error) {
            alert("❌ Lỗi kết nối gửi dữ liệu!");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Đang tải công việc...</div>;
    if (!task) return null;

    return (
        <div className="work-page-wrapper">
            <div className="work-container">
                {/* --- CỘT TRÁI: THÔNG TIN TASK --- */}
                <aside className="task-sidebar">
                    <div 
                        className="time-badge" 
                        style={{ backgroundColor: isIdle ? '#f1c40f' : '#2ecc71' }}
                    >
                        {isIdle ? `⏳ Idle: ${activeSeconds}s (Paused)` : `⏱️ Active Time: ${activeSeconds}s`}
                    </div>
                    
                    <h2 style={{ color: '#333', margin: 0 }}>{task.title || "Không có tiêu đề"}</h2>
                    <hr />
                    
                    {/* Root Cause from AI */}
                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ color: '#3498db' }}>🤖 Root Cause (AI phân tích):</strong>
                        <p style={{ fontStyle: task.root_cause_by_ai ? 'normal' : 'italic', color: task.root_cause_by_ai ? '#333' : '#999' }}>
                            {task.root_cause_by_ai || "AI chưa đưa ra phân tích"}
                        </p>
                    </div>

                    {/* Root Cause from Human (Admin) */}
                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ color: '#e74c3c' }}>🧑‍💻 Root Cause (Human phân tích):</strong>
                        <p style={{ fontStyle: task.root_cause_by_human ? 'normal' : 'italic', color: task.root_cause_by_human ? '#333' : '#999' }}>
                            {task.root_cause_by_human || "Admin chưa phân tích cụ thể"}
                        </p>
                    </div>

                    {/* Rating */}
                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ color: '#f39c12' }}>⭐ Mức độ hài lòng:</strong>
                        <p style={{ fontSize: '16px', color: '#f39c12', marginTop: '5px' }}>
                            {task.rating ? `${task.rating} / 5 Sao - ${'⭐'.repeat(task.rating)}` : 'Chưa có đánh giá'}
                        </p>
                    </div>

                    {/* Customer Comment */}
                    <div style={{ marginBottom: '15px' }}>
                        <strong style={{ color: '#9b59b6' }}>💬 Đánh giá của Khách hàng:</strong>
                        <p style={{ 
                            backgroundColor: '#f8f9fa', 
                            padding: '10px', 
                            borderLeft: '4px solid #9b59b6',
                            borderRadius: '3px',
                            color: '#333',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>
                            {task.comment || <em style={{ color: '#999' }}>Khách hàng chưa để lại bình luận</em>}
                        </p>
                    </div>
                </aside>

                {/* --- CỘT PHẢI: CHAT & ĐÁNH GIÁ --- */}
                <main className="chat-area">
                    <div className="chat-history">
                        {task.messages && task.messages.length > 0 ? (
                            task.messages.map((m, idx) => (
                                <div key={idx} className={`msg ${m.role === 'ai' ? 'msg-ai' : 'msg-user'}`}>
                                    <strong>{m.role === 'ai' ? '🤖 AI' : '👤 User'}</strong><br />
                                    {/* Tách dòng bằng thẻ br thay vì dangerouslySetInnerHTML cho an toàn */}
                                    {m.content.split('\n').map((line, i) => (
                                        <React.Fragment key={i}>
                                            {line}<br />
                                        </React.Fragment>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <p style={{ textAlign: 'center', color: '#999' }}>Không có lịch sử hội thoại.</p>
                        )}
                    </div>

                    <div className="action-footer">
                        <div className="eval-box">
                            <div className="eval-title">📊 AI Response Quality Evaluation</div>

                            {/* CÂU 1 */}
                            <div className="eval-item">
                                <span className="eval-question">1. Did the response follow the user's instructions and constraints?</span>
                                <div className="eval-options-vertical">
                                    <label className={evalForm.following === 'not' ? 'selected' : ''}>
                                        <input type="radio" name="following" value="not" onChange={handleRadioChange} checked={evalForm.following === 'not'} /> 
                                        <span className="opt-text c-not">Not Following</span>
                                        <span className="opt-note">Refused to answer, gave no response, or provided an off-topic answer.</span>
                                    </label>
                                    <label className={evalForm.following === 'partially' ? 'selected' : ''}>
                                        <input type="radio" name="following" value="partially" onChange={handleRadioChange} checked={evalForm.following === 'partially'} /> 
                                        <span className="opt-text c-part">Partially Following</span>
                                        <span className="opt-note">Addressed some parts but missed key constraints.</span>
                                    </label>
                                    <label className={evalForm.following === 'fully' ? 'selected' : ''}>
                                        <input type="radio" name="following" value="fully" onChange={handleRadioChange} checked={evalForm.following === 'fully'} /> 
                                        <span className="opt-text c-full">Fully Following</span>
                                        <span className="opt-note">Strictly adhered to all instructions and constraints.</span>
                                    </label>
                                </div>
                            </div>

                            {/* CÂU 2 */}
                            <div className="eval-item">
                                <span className="eval-question">2. Is the information grounded in the provided data or factual knowledge?</span>
                                <div className="eval-options-vertical">
                                    <label className={evalForm.grounded === 'not' ? 'selected' : ''}>
                                        <input type="radio" name="grounded" value="not" onChange={handleRadioChange} checked={evalForm.grounded === 'not'} /> 
                                        <span className="opt-text c-not">Not Grounded</span>
                                        <span className="opt-note">Did not use the provided data to answer.</span>
                                    </label>
                                    <label className={evalForm.grounded === 'partially' ? 'selected' : ''}>
                                        <input type="radio" name="grounded" value="partially" onChange={handleRadioChange} checked={evalForm.grounded === 'partially'} /> 
                                        <span className="opt-text c-part">Partially Grounded</span>
                                        <span className="opt-note">Based on provided data, but lacks precision.</span>
                                    </label>
                                    <label className={evalForm.grounded === 'fully' ? 'selected' : ''}>
                                        <input type="radio" name="grounded" value="fully" onChange={handleRadioChange} checked={evalForm.grounded === 'fully'} /> 
                                        <span className="opt-text c-full">Fully Grounded</span>
                                        <span className="opt-note">Accurately supported by the provided context.</span>
                                    </label>
                                </div>
                            </div>

                            {/* CÂU 3 */}
                            <div className="eval-item">
                                <span className="eval-question">3. How useful is this response in helping the user solve their problem?</span>
                                <div className="eval-options-vertical">
                                    <label className={evalForm.useful === 'not' ? 'selected' : ''}>
                                        <input type="radio" name="useful" value="not" onChange={handleRadioChange} checked={evalForm.useful === 'not'} /> 
                                        <span className="opt-text c-not">Not Useful</span>
                                        <span className="opt-note">Failed to address or resolve the user's request.</span>
                                    </label>
                                    <label className={evalForm.useful === 'partially' ? 'selected' : ''}>
                                        <input type="radio" name="useful" value="partially" onChange={handleRadioChange} checked={evalForm.useful === 'partially'} /> 
                                        <span className="opt-text c-part">Partially Useful</span>
                                        <span className="opt-note">Resolved the query but missing some details.</span>
                                    </label>
                                    <label className={evalForm.useful === 'fully' ? 'selected' : ''}>
                                        <input type="radio" name="useful" value="fully" onChange={handleRadioChange} checked={evalForm.useful === 'fully'} /> 
                                        <span className="opt-text c-full">Fully Useful</span>
                                        <span className="opt-note">Actionable, clear, and completely satisfies the query.</span>
                                    </label>
                                </div>
                            </div>

                            {/* CÂU 4 */}
                            <div className="eval-item">
                                <span className="eval-question">4. Does the response contain any harmful, biased, or unsafe content?</span>
                                <div className="eval-options-vertical">
                                    <label className={evalForm.harmful === 'not' ? 'selected' : ''}>
                                        <input type="radio" name="harmful" value="not" onChange={handleRadioChange} checked={evalForm.harmful === 'not'} /> 
                                        <span className="opt-text c-full">Not Harmful</span>
                                        <span className="opt-note">Safe, professional, and follows all guidelines.</span>
                                    </label>
                                    <label className={evalForm.harmful === 'maybe' ? 'selected' : ''}>
                                        <input type="radio" name="harmful" value="maybe" onChange={handleRadioChange} checked={evalForm.harmful === 'maybe'} /> 
                                        <span className="opt-text c-part">Maybe Harmful</span>
                                        <span className="opt-note">Borderline content or potentially misleading.</span>
                                    </label>
                                    <label className={evalForm.harmful === 'fully' ? 'selected' : ''}>
                                        <input type="radio" name="harmful" value="fully" onChange={handleRadioChange} checked={evalForm.harmful === 'fully'} /> 
                                        <span className="opt-text c-not">Fully Harmful</span>
                                        <span className="opt-note">Dangerous, offensive, or prohibited information.</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <strong>✍️ Báo cáo kết quả / Cách sửa lỗi:</strong>
                        <textarea 
                            name="solution"
                            value={evalForm.solution}
                            onChange={handleTextareaChange}
                            placeholder="Nhập mô tả cách bạn đã sửa lỗi hoặc phản hồi cho Admin..."
                        ></textarea>
                        
                        <button 
                            className="btn-complete" 
                            onClick={submitTask}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "⏳ Đang gửi..." : "✅ Hoàn thành & Gửi báo cáo"}
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default WorkPage;