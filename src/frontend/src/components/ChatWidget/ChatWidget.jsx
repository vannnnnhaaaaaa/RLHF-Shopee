import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import MessageFormatter from '../MessageFormatter/MessageFormatter';
import './style.scss';

function ChatWidget() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState("");

  // Cấu hình tags cho từng mức sao
  const feedbackOptions = {
    1: ["AI không hiểu câu hỏi", "Trả lời sai kiến thức", "Thái độ không tốt", "Lỗi kỹ thuật"],
    2: ["Trả lời lạc đề", "Gợi ý sai sản phẩm", "Tốc độ rất chậm", "Thông tin sơ sài"],
    3: ["Tạm chấp nhận được", "Cần cải thiện tốc độ", "Thông tin chưa đầy đủ"],
    4: ["Trả lời đúng trọng tâm", "Gợi ý sản phẩm tốt", "Dễ hiểu", "Hữu ích"],
    5: ["Rất thông minh", "Giải quyết vấn đề nhanh", "Tư vấn tuyệt vời", "Giao diện đẹp"]
  };

  const handleCloseChat = () => {
    // Nếu đã có tin nhắn trao đổi thì hiện feedback, nếu chưa có gì thì đóng luôn
    if (messages.length > 1) {
      setShowFeedback(true);
    } else {
      setIsChatOpen(false);
    }
  };
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Chào bạn! Mình là trợ lý AI. Mình có thể giúp gì cho bạn?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [threadId] = useState(() => `thread_${Date.now()}_${Math.floor(Math.random() * 1000)}`);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      // Gọi API lên Backend
      const response = await axios.post('http://localhost:8000/chat', {
        question: userMsg,
        thread_id: threadId,
        history: []
      });
      console.log("DỮ LIỆU API TRẢ VỀ:", response);

      const botReply = response.data.answer;
      setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    } catch (error) {
      console.error("Lỗi Chatbot:", error);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Xin lỗi, AI đang gặp sự cố. Vui lòng thử lại sau.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="chatbot-wrapper">
      <button
        className={`chatbot-toggle-btn ${isChatOpen ? 'hidden' : ''}`}
        onClick={() => setIsChatOpen(true)}
      >
        💬 Chat với chúng tôi
      </button>

      <div className={`chatbot-window ${isChatOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <h4>Hỗ trợ trực tuyến</h4>
          <button onClick={() => setIsChatOpen(false)}>✖</button>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.sender}`}>
              {/* NẾU LÀ BOT THÌ ĐƯA VÀO FORMATTER ĐỂ XỬ LÝ MARKDOWN */}
              {msg.sender === 'bot' ? (
                <MessageFormatter rawText={msg.text} />
              ) : (
                msg.text
              )}
            </div>
          ))}

          {isChatLoading && (
            <div className="message-bubble bot loading">
              <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chatbot-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isChatLoading}
          />
          <button type="submit" disabled={isChatLoading || !inputMessage.trim()}>
            Gửi
          </button>
        </form>
        {showFeedback && (
          <div className="feedback-overlay">
            <div className="feedback-content">
              <h5>Đánh giá trải nghiệm</h5>

              {/* 1. Chọn Sao */}
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${rating >= star ? 'active' : ''}`}
                    onClick={() => { setRating(star); setSelectedTags([]); }}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* 2. Hiện Tags dựa trên sao đã chọn */}
              {rating > 0 && (
                <div className="tags-container">
                  {feedbackOptions[rating].map((tag) => (
                    <button
                      key={tag}
                      className={`tag-btn ${selectedTags.includes(tag) ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                        );
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* 3. Nhập ý kiến thêm */}
              <textarea
                placeholder="Ý kiến khác (không bắt buộc)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <div className="feedback-actions">
                <button className="skip-btn" onClick={() => setIsChatOpen(false)}>Để sau</button>
                <button className="send-btn" onClick={submitFeedback} disabled={rating === 0}>Gửi đánh giá</button>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

export default ChatWidget;