# 🎯 Nền tảng Điều phối AI & Gán nhãn Dữ liệu (Agentic RAG + RLHF Platform)

Một hệ thống toàn diện kết hợp giữa **Agentic Workflow** (AI tự động xử lý) và **Human-in-the-Loop** (Con người kiểm duyệt). Dự án được thiết kế để tự động hóa việc truy xuất thông tin (RAG), tự sửa lỗi, sau đó thu thập ý kiến đồng thuận của con người (Human Feedback) nhằm phục vụ cho quá trình tinh chỉnh các mô hình ngôn ngữ lớn (RLHF).

---

---

## 🧠 GIAI ĐOẠN 1: Luồng suy nghĩ của AI (E-commerce AI Orchestration với LangGraph)

Hệ thống Chatbot không sử dụng kỹ thuật RAG cơ bản mà được thiết kế dưới dạng một **State Machine (Máy trạng thái)** chuyên biệt cho nghiệp vụ e-commerce. AI sẽ xử lý thông tin đa lượt (Sliding Window) qua 3 trạm (Nodes) cốt lõi để đảm bảo tốc độ phản hồi và độ chính xác tuyệt đối:

### 🚦 Node 1: Phân tích Ý định & Trích xuất Dữ liệu (Router & Extractor)

AI đóng vai trò như một bộ lọc thông minh ở cửa ngõ, sử dụng `LLM` kết hợp với tính năng `Structured Output` (Pydantic) để bóc tách tin nhắn của khách hàng:

* **Phân loại Intent:** Nhận diện khách đang muốn Tìm sản phẩm (`search_product`), Chào hỏi (`greeting`), hay Hỏi ngoài lề (`out_of_scope`).
* **Trích xuất Tham số (Entity Extraction):** Tự động gom các điều kiện tìm kiếm như: khoảng giá (max_price, min_price), danh mục (category), màu sắc, kích cỡ... thành một chuẩn JSON thống nhất.

### 🔍 Node 2: Tìm kiếm Lai (Hybrid Search với PostgreSQL & pgvector)

Nếu Intent là tìm mua hàng, hệ thống bỏ qua việc dùng các VectorDB đắt đỏ bên ngoài mà tích hợp truy vấn trực tiếp dưới Database bằng **Hybrid Search**:

* **Pre-filtering (Lọc cứng):** Áp dụng SQL Metadata Filtering để chặn cứng các điều kiện về khoảng giá và danh mục (VD: `price <= max_price`). Giúp tối ưu không gian tìm kiếm.
* **Semantic Vector Search (Lọc mềm):** Nhúng (Embedding) các thuộc tính khách hàng miêu tả thành Vector. Kế tiếp, sử dụng phép đo khoảng cách **Cosine Similarity** (`pgvector`) để tìm ra 5 sản phẩm khớp ý định nhất, bất chấp việc khách gõ sai chính tả hay dùng từ đồng nghĩa.

### 🗣️ Node 3: Sinh câu trả lời có kiểm soát (Grounded Generator)

Dữ liệu sản phẩm trả về từ Database (Tên, Giá tiền, ID) được đưa vào Prompt làm Context khép kín.

* **Kiểm soát Ảo giác (Anti-Hallucination):** AI bị ràng buộc bởi System Prompt khắt khe, chỉ được phép tư vấn và báo giá dựa trên danh sách hàng có thật do Database cung cấp. Tuyệt đối không tự bịa sản phẩm (Hallucinate) hay chém gió lan man.
* **Tạo tương tác (Call-to-Action):** Khéo léo chèn link sản phẩm và kêu gọi khách hàng mua sắm một cách tự nhiên.

> **💡 Điểm khác biệt:** Việc tách bạch hoàn toàn "Não bộ phân tích" (Node 1 & 3) và "Mắt xích tìm kiếm" (Node 2) giúp hệ thống triệt tiêu hoàn toàn rủi ro AI báo sai giá, đồng thời luồng suy nghĩ của AI ở bước này sẽ được đóng gói lại để chuyển sang Giai đoạn 2 cho con người đánh giá (RLHF).
>

## ⚖️ GIAI ĐOẠN 2: Quy trình Kiểm duyệt & RLHF (Human-in-the-loop)

> **Mục tiêu cốt lõi:** Tránh việc tạo Task rác từ mọi đánh giá của User. Hệ thống đi qua một quy trình QA (Quality Assurance) nhiều lớp để đảm bảo dữ liệu đưa vào gán nhãn phải là "vàng ròng".

### 🤖 1. AI Re-Evaluation (Bộ lọc tiền xử lý)

* **Phân tích Feedback:** AI tự động bóc tách cảm xúc từ `Comment` và `Rating (1-5⭐)` của người dùng.
* **Tự kiểm lỗi (Self-Correction):** AI tự đối chiếu lại câu trả lời của mình với Feedback. Hệ thống **chỉ khởi tạo Task** khi AI xác nhận bản thân "có sai sót" (thường ở mức 1-3 sao).

### 👨‍💻 2. Quản trị & Phân phối Task (Admin Oversight)

* **Pre-check:** Admin duyệt nhanh danh sách Task do AI báo cáo để loại trừ các trường hợp User troll/spam.
* **Triple-Blind Review:** Task hợp lệ được hệ thống tự động phân phối ngẫu nhiên cho **03 Member** độc lập để đảm bảo tính khách quan tuyệt đối.
  `<img width="1788" height="906" alt="image" src="https://github.com/user-attachments/assets/a41bc2d5-764d-4516-aa11-5d056b3df602" />`

### 🎯 3. Đánh giá đa tiêu chí (Multi-criteria Annotation)

Các Member sẽ mổ xẻ "vết suy nghĩ" của AI và chấm điểm chéo dựa trên 4 ma trận:

* **`[ Following ]`** Mức độ tuân thủ các chỉ dẫn/ràng buộc trong Prompt.
* **`[ Grounded ]`** Độ xác thực dựa trên Context được cung cấp (Kiểm soát Ảo giác - Hallucination).
* **`[ Useful ]`** Tính thiết thực và giá trị giải quyết vấn đề cho User.
* **`[ Harmful ]`** Màng lọc an toàn, chặn các vi phạm chính sách hoặc ngôn từ độc hại.
  `<img width="1797" height="876" alt="image" src="https://github.com/user-attachments/assets/9635b31d-aaf3-44d6-8e24-8b82097ab525" />`

### ⚔️ 4. Kiểm soát Đồng thuận & Xung đột (Consensus vs. Conflict)

* ✅ **Đồng thuận 100%:** 3 Member có chung kết quả ➔ Task tự động đóng, dữ liệu được đưa vào tập `Gold Standard`.
* ⚠️ **Xung đột (Conflict):** Có bất kỳ sự sai lệch nào ➔ Task bị khóa. Admin sẽ trực tiếp nhảy vào Review, chỉnh sửa bằng `Inline Editing` và chốt kết quả Final.
  `<img width="1393" height="895" alt="image" src="https://github.com/user-attachments/assets/e507d6fa-c754-4da0-8d6f-22bbbea7d345" />`

### ⚖️ 5. Hệ thống Điểm uy tín (Penalty & Reliability)

* **Auto-Scoring:** Tự động đối chiếu bài làm của từng Member với đáp án Final (của Admin hoặc từ sự đồng thuận).
* **Penalty:** Tự động **trừ điểm uy tín** đối với Labeler đánh giá sai, hời hợt hoặc làm cho có. Giúp thanh lọc và duy trì đội ngũ QA chất lượng cao.
  `<img width="1455" height="662" alt="image" src="https://github.com/user-attachments/assets/3e694052-db99-4856-81fb-3b1dcee95f3c" />`

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
