# 🎯 Nền tảng Điều phối AI & Gán nhãn Dữ liệu (Agentic RAG + RLHF Platform)

Một hệ thống toàn diện kết hợp giữa **Agentic Workflow** (AI tự động xử lý) và **Human-in-the-Loop** (Con người kiểm duyệt). Dự án được thiết kế để tự động hóa việc truy xuất thông tin (RAG), tự sửa lỗi, sau đó thu thập ý kiến đồng thuận của con người (Human Feedback) nhằm phục vụ cho quá trình tinh chỉnh các mô hình ngôn ngữ lớn (RLHF).

---

## 🧠 GIAI ĐOẠN 1: Luồng suy nghĩ của AI (AI Orchestration với LangGraph)

Trước khi đưa cho con người gán nhãn, hệ thống sử dụng LangGraph để xây dựng một "Bộ não" (State Machine) giúp AI phân tích câu hỏi, tự tìm kiếm và tự đánh giá chất lượng tài liệu. Quá trình này đi qua các Node (nút trạm) cụ thể:

1. **Khởi tạo & Phân luồng (Init Node & Routing):** AI tiếp nhận câu hỏi và kiểm tra xem người dùng đang muốn "Chat phiếm" hay "Tìm kiếm kiến thức".
2. **Hiểu Ngữ cảnh (Rewrite Node):** Nếu đang trong một cuộc hội thoại dài, AI sẽ tự động đọc lại lịch sử (chat_history) và viết lại câu hỏi sao cho rõ nghĩa nhất trước khi đi tìm kiếm.
3. **Truy xuất & Tự chấm điểm (Retriever & Grader Node):** AI tiến hành tìm kiếm tài liệu (RAG). Điểm đặc biệt là AI sẽ tự chấm điểm (Grader) tài liệu vừa tìm được.
4. **Vòng lặp tự sửa lỗi (Self-Correction Logic):** Nếu điểm chất lượng tài liệu < 0.8, AI tự nhận thấy "Thông tin này chưa đủ tốt" và kích hoạt vòng lặp: Tăng biến đếm retry_count -> Sửa lại từ khóa -> Tìm kiếm lại (tối đa 2 lần để tiết kiệm chi phí).
5. **Tổng hợp & Trả lời (Selector & Generate Node):** Chọn lọc những thông tin tốt nhất sau các vòng lặp và sinh ra câu trả lời cuối cùng.

> **💡 Lưu ý:** Toàn bộ "vết suy nghĩ" của AI (số lần thử, điểm số tài liệu, bối cảnh) sẽ được lưu lại làm dữ liệu đầu vào cho con người đánh giá ở Giai đoạn 2.
<img width="1894" height="441" alt="image" src="https://github.com/user-attachments/assets/24339713-87e3-4c4f-a605-de5d266b3257" />


<img width="1894" height="918" alt="image" src="https://github.com/user-attachments/assets/3eea7237-5e40-4cd6-9301-cb2ee8a11345" />

---
## ⚖️ GIAI ĐOẠN 2: Quy trình Kiểm duyệt & RLHF (Human-in-the-loop)

> **Mục tiêu cốt lõi:** Tránh việc tạo Task rác từ mọi đánh giá của User. Hệ thống đi qua một quy trình QA (Quality Assurance) nhiều lớp để đảm bảo dữ liệu đưa vào gán nhãn phải là "vàng ròng".



### 🤖 1. AI Re-Evaluation (Bộ lọc tiền xử lý)
* **Phân tích Feedback:** AI tự động bóc tách cảm xúc từ `Comment` và `Rating (1-5⭐)` của người dùng.
* **Tự kiểm lỗi (Self-Correction):** AI tự đối chiếu lại câu trả lời của mình với Feedback. Hệ thống **chỉ khởi tạo Task** khi AI xác nhận bản thân "có sai sót" (thường ở mức 1-3 sao).

### 👨‍💻 2. Quản trị & Phân phối Task (Admin Oversight)
* **Pre-check:** Admin duyệt nhanh danh sách Task do AI báo cáo để loại trừ các trường hợp User troll/spam.
* **Triple-Blind Review:** Task hợp lệ được hệ thống tự động phân phối ngẫu nhiên cho **03 Member** độc lập để đảm bảo tính khách quan tuyệt đối.
<img width="1788" height="906" alt="image" src="https://github.com/user-attachments/assets/a41bc2d5-764d-4516-aa11-5d056b3df602" />
### 🎯 3. Đánh giá đa tiêu chí (Multi-criteria Annotation)
Các Member sẽ mổ xẻ "vết suy nghĩ" của AI và chấm điểm chéo dựa trên 4 ma trận:
* **`[ Following ]`** Mức độ tuân thủ các chỉ dẫn/ràng buộc trong Prompt.
* **`[ Grounded ]`** Độ xác thực dựa trên Context được cung cấp (Kiểm soát Ảo giác - Hallucination).
* **`[ Useful ]`** Tính thiết thực và giá trị giải quyết vấn đề cho User.
* **`[ Harmful ]`** Màng lọc an toàn, chặn các vi phạm chính sách hoặc ngôn từ độc hại.
<img width="1797" height="876" alt="image" src="https://github.com/user-attachments/assets/9635b31d-aaf3-44d6-8e24-8b82097ab525" />

### ⚔️ 4. Kiểm soát Đồng thuận & Xung đột (Consensus vs. Conflict)
* ✅ **Đồng thuận 100%:** 3 Member có chung kết quả ➔ Task tự động đóng, dữ liệu được đưa vào tập `Gold Standard`.
* ⚠️ **Xung đột (Conflict):** Có bất kỳ sự sai lệch nào ➔ Task bị khóa. Admin sẽ trực tiếp nhảy vào Review, chỉnh sửa bằng `Inline Editing` và chốt kết quả Final.
<img width="1393" height="895" alt="image" src="https://github.com/user-attachments/assets/e507d6fa-c754-4da0-8d6f-22bbbea7d345" />

### ⚖️ 5. Hệ thống Điểm uy tín (Penalty & Reliability)
* **Auto-Scoring:** Tự động đối chiếu bài làm của từng Member với đáp án Final (của Admin hoặc từ sự đồng thuận).
* **Penalty:** Tự động **trừ điểm uy tín** đối với Labeler đánh giá sai, hời hợt hoặc làm cho có. Giúp thanh lọc và duy trì đội ngũ QA chất lượng cao.
<img width="1455" height="662" alt="image" src="https://github.com/user-attachments/assets/3e694052-db99-4856-81fb-3b1dcee95f3c" />

---

> 💡 **Core Value:** Quy trình này đảm bảo đầu ra là bộ dữ liệu ưu tiên (Preference Data) siêu sạch, phục vụ trực tiếp cho việc Fine-tuning mô hình theo phương pháp **DPO (Direct Preference Optimization)**. AI của bạn sẽ "tiến hóa" chính xác theo ý muốn của con người sau mỗi chu kỳ.

<img width="1252" height="189" alt="image" src="https://github.com/user-attachments/assets/ba1e294a-fb47-4fb5-9ff6-4485f5d1572d" />

<img width="642" height="142" alt="image" src="https://github.com/user-attachments/assets/569841df-841e-4335-b80f-d7b30e87ce22" />

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

* **AI & LLM Framework:** LangChain, LangGraph (State Graph, Conditional Edges).
* **Backend:** Python, FastAPI.
* **Database:** PostgreSQL (quản lý qua ORM SQLModel / SQLAlchemy).
* **Frontend:** HTML5, CSS3, Vanilla JavaScript.
* **Data Visualization:** Chart.js (Dashboard thống kê hiệu suất người gán nhãn).
* **Security:** Phân quyền Admin / Member bằng JWT Bearer Tokens.

---




