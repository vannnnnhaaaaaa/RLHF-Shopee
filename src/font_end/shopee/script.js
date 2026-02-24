// ==========================================
// 1. PHẦN RENDER SẢN PHẨM (GIỮ NGUYÊN)
// ==========================================
const grid = document.getElementById('productGrid');

async function loadproduct() {
    try {
        const response = await fetch('http://127.0.0.1:8000/products/');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Lỗi khi load sản phẩm:", error);
        return [];
    }
}

async function renderProducts() {
    if (!grid) return;

    const displayData = await loadproduct();

    if (displayData && Array.isArray(displayData)) {
        displayData.forEach(p => {
            const card = document.createElement('div');
            card.className = 'shopee-card';

            card.innerHTML = `
                <div class="card-img">
                    <img src="${p.image_link}" onerror="this.src='https://via.placeholder.com/150'">
                </div>
                <div class="card-body">
                    <div class="card-title">${p.name}</div>
                    <div class="card-price"><span>₫</span>${p.price.toLocaleString('vi-VN')}</div>
                    <div class="card-footer">
                        <span>Đã bán ${p.stock || '0'}</span>
                        <span>${p.category}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                const targetLink = p.product_link;
                if (targetLink) {
                    window.open(targetLink, '_blank');
                } else {
                    console.warn("Sản phẩm này không có link!");
                }
            });

            grid.appendChild(card);
        });
    }
}

renderProducts();


// ==========================================
// 2. PHẦN CHATBOT & FEEDBACK (ĐÃ SỬA LỖI)
// ==========================================

// --- Khai báo biến ---
const chatWindow = document.getElementById('chatWindow');
const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');
const typing = document.getElementById('typing');
const ratingOverlay = document.getElementById('ratingOverlay');
const stars = document.querySelectorAll('#starContainer span');

const API_URL = "http://localhost:8000/chat/";
const FEEDBACK_API = "http://localhost:8000/feedback/";

// [QUAN TRỌNG] Dùng let để có thể reset ID
let THREAD_ID = "user_" + Date.now(); 
let chatHistory = []; // Mảng lưu lịch sử

let hasChatted = false;
let currentSessionRating = 0;

const FEEDBACK_OPTIONS = {
    1: ["Trả lời sai ❌", "Không hiểu câu hỏi", "Thái độ tệ 😠", "Spam"],
    2: ["Trả lời sai ❌", "Hơi lan man", "Thông tin cũ", "Chưa giải quyết được"],
    3: ["Tạm ổn 👌", "Cần chi tiết hơn", "Phản hồi chậm", "Bình thường"],
    4: ["Khá tốt 👍", "Đúng trọng tâm", "Nhiệt tình", "Dễ hiểu"],
    5: ["Tuyệt vời 😍", "Tư vấn chuẩn", "Rất hữu ích", "Siêu nhanh ⚡"]
};

// --- A. LOGIC ĐÓNG / MỞ CHAT ---

function toggleChat() {
    if (chatWindow.classList.contains('active')) {
        handleCloseChat();
    } else {
        chatWindow.classList.add('active');
        setTimeout(() => chatInput.focus(), 300);
    }
}

function handleCloseChat() {
    // Nếu đã chat thì hiện bảng đánh giá, nếu chưa thì đóng luôn
    if (hasChatted) {
        ratingOverlay.style.display = 'flex';
    } else {
        closeFinalChat();
    }
}

function closeFinalChat() {
    console.log("Đang tiến hành reset chat...");

    // 1. Ẩn giao diện ngay lập tức
    chatWindow.classList.remove('active');
    ratingOverlay.style.display = 'none';

    // 2. Reset dữ liệu và UI sau 400ms (để hiệu ứng đóng cửa sổ chạy xong)
    setTimeout(() => {
        if (chatBody) {
            chatBody.innerHTML = '';
        }

        // Reset các biến logic
        hasChatted = false;
        chatHistory = [];
        currentSessionRating = 0;
        
        // Tạo ID mới cho phiên tiếp theo
        THREAD_ID = "user_" + Date.now();

        // Reset giao diện đánh giá
        stars.forEach(s => s.classList.remove('active'));
        const tagContainer = document.getElementById('feedbackTags');
        if(tagContainer) tagContainer.innerHTML = '';
        const commentInput = document.getElementById('ratingComment');
        if(commentInput) commentInput.value = '';

        // Gửi lời chào cho phiên mới
        renderMessage("Cửa sổ chat đã được làm mới. Mình có thể giúp gì thêm cho bạn?", 'bot');

        console.log("Đã reset phiên chat mới:", THREAD_ID);
    }, 400);
}


// --- B. LOGIC GỬI TIN NHẮN ---

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });
}

async function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    // 1. Hiện tin nhắn User
    renderMessage(text, 'user');
    chatHistory.push("User: " + text);
    
    chatInput.value = '';
    hasChatted = true;
    typing.style.display = 'block';
    scrollToBottom();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: text,
                thread_id: THREAD_ID
            })
        });

        const data = await response.json();
        typing.style.display = 'none';

        // [QUAN TRỌNG] Kiểm tra dữ liệu trả về để tránh lỗi marked()
        // Ưu tiên lấy data.answer, nếu không có thì lấy message, hoặc fallback text
        let botResponse = data.answer  || "Xin lỗi, mình không nhận được phản hồi từ hệ thống.";

        // Lưu vào lịch sử
        chatHistory.push("Bot: " + botResponse);

        console.log("Bot Response:", data);

        // Parse Markdown (nếu thư viện tồn tại)
        let content = (typeof marked !== 'undefined') ? marked.parse(botResponse) : botResponse;
        
        // Hiện tin nhắn Bot
        renderMessage(content, 'bot', true, data.id);

    } catch (error) {
        typing.style.display = 'none';
        console.error("Lỗi gửi tin nhắn:", error);
        renderMessage("❌ Lỗi kết nối server. Vui lòng thử lại sau.", 'bot');
    }
}

function renderMessage(content, sender, isHtml = false, messageId = null) {
    if (!chatBody) return;

    const div = document.createElement('div');
    div.className = `msg ${sender}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    
    if (isHtml) contentDiv.innerHTML = content;
    else contentDiv.textContent = content;
    
    div.appendChild(contentDiv);
    chatBody.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}


// --- C. LOGIC GỬI FEEDBACK ---

// 1. Logic chọn Sao -> Hiện Tags gợi ý
stars.forEach(star => {
    star.addEventListener('click', function () {
        currentSessionRating = this.getAttribute('data-value');

        // Tô màu sao
        stars.forEach(s => {
            if (s.getAttribute('data-value') <= currentSessionRating) s.classList.add('active');
            else s.classList.remove('active');
        });

        // Render Tags tương ứng
        renderFeedbackTags(currentSessionRating);
    });
});

function renderFeedbackTags(rating) {
    const container = document.getElementById('feedbackTags');
    if (!container) return;
    
    container.innerHTML = ''; // Xóa tags cũ
    const options = FEEDBACK_OPTIONS[rating] || [];

    options.forEach(text => {
        const tag = document.createElement('span');
        tag.className = 'feedback-tag';
        tag.textContent = text;

        // Sự kiện click chọn Tag
        tag.onclick = function () {
            this.classList.toggle('selected');
        };

        container.appendChild(tag);
    });
}

// 2. Gửi đánh giá tổng
async function submitSessionRating() {
    if (currentSessionRating == 0) {
        alert("Bạn vui lòng chọn số sao để đánh giá nhé! ⭐");
        return;
    }

    // Lấy các tag đang được chọn
    const selectedTags = Array.from(document.querySelectorAll('.feedback-tag.selected'))
        .map(tag => tag.textContent);

    const userCommentElement = document.getElementById('ratingComment');
    const userComment = userCommentElement ? userCommentElement.value.trim() : "";

    // Gộp nội dung comment
    let finalComment = selectedTags.join(', ');
    if (userComment) {
        if (finalComment) finalComment += ". ";
        finalComment += "Ghi chú: " + userComment;
    }

    if (!finalComment) finalComment = "Đánh giá theo sao (Không có lời nhắn)";

    try {
        const response = await fetch(FEEDBACK_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                thread_id: THREAD_ID,
                rating: parseInt(currentSessionRating),
                comment: finalComment,
                history: chatHistory 
            })
        });

        // [QUAN TRỌNG] Kiểm tra status code (200-299 là thành công)
        if (response.ok) {
            alert("Cảm ơn bạn đã đóng góp ý kiến! Hẹn gặp lại! 👋");
            closeFinalChat(); // Chỉ đóng khi gửi thành công
        } else {
            console.error("Lỗi Server:", await response.text());
            alert("Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại.");
        }

    } catch (e) {
        console.error("Lỗi Network:", e);
        alert("Không thể kết nối đến server.");
    }
}