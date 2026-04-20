# 🎯 Shope Platform — Nền tảng Thương mại điện tử tích hợp AI & RLHF

> **Shope** là một hệ thống thương mại điện tử đầy đủ tính năng, kết hợp **Chatbot AI tự động** (Agentic RAG) và **quy trình RLHF** (Reinforcement Learning from Human Feedback) để tinh chỉnh mô hình ngôn ngữ lớn. Hệ thống bao gồm cả giao diện khách hàng, kênh người bán và bảng điều khiển quản trị.

---

## 📂 Cấu trúc dự án

```
shope/
├── src/
│   ├── backend/                  # FastAPI Backend
│   │   ├── Router_api/           # API Routers (product, order, cart, chat, ...)
│   │   ├── services/             # Business logic services
│   │   ├── chatbot_assistant/    # LangGraph AI Chatbot (Agentic RAG)
│   │   │   ├── graph/            # State machine: router → search → generate
│   │   │   ├── core/             # Logger, exception, lifespan
│   │   │   └── config/            # Cài đặt embedding model
│   │   ├── models.py             # SQLModel database models
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── auth.py               # JWT authentication & authorization
│   │   ├── config.py             # Cấu hình biến môi trường
│   │   └── main.py               # FastAPI app entry point
│   └── frontend/                 # React + Vite Frontend
│       ├── src/
│       │   ├── pages/
│       │   │   ├── shopee/       # Giao diện khách hàng (Home, Cart, Profile, Checkout, Purchase)
│       │   │   ├── Seller/        # Kênh người bán (Dashboard, Quản lý sản phẩm, đơn hàng, voucher)
│       │   │   └── shope_RLHF/    # Giao diện RLHF (Admin Dashboard, Member Dashboard, Login)
│       │   ├── components/        # React components dùng chung
│       │   └── services/          # API client (axios)
│       └── package.json
├── data/                         # Dữ liệu thô & database
├── docker-compose.yml            # PostgreSQL + pgvector
├── requirements.txt              # Python dependencies
└── README.md
```

---

## 🧠 Tổng quan kiến trúc

```
Khách hàng (Frontend)
        │
        ├── Chatbot AI  ──►  LangGraph State Machine
        │                        ├── Node 1: Router & Extractor (Intent + Entity)
        │                        ├── Node 2: Hybrid Search (Lexical + Semantic + RRF)
        │                        └── Node 3: Grounded Generator (RAG Response)
        │
        ├── Mua sắm   ──►  Product / Cart / Order / Voucher APIs
        │
        └── Đánh giá   ──►  Feedback API ──► RLHF Pipeline

Kênh người bán (Frontend)
        └── Dashboard  ──►  Seller APIs (quản lý sản phẩm, đơn hàng, voucher, phân tích)

RLHF Pipeline (Backend + Admin/Member Frontend)
        └── AI Re-Eval → Task → Triple-Blind Review → Consensus/Conflict → Final Result → DPO Dataset
```

---

## ⚙️ Giai đoạn 1 — Chatbot AI (Agentic RAG với LangGraph)

Hệ thống Chatbot không dùng RAG cơ bản mà hoạt động dưới dạng **State Machine** với 3 Node xử lý liên tiếp, đảm bảo tốc độ và độ chính xác cao.

### 🚦 Node 1 — Phân tích Ý định & Trích xuất Dữ liệu

- **Phân loại Intent:** Nhận diện `search_product`, `greeting`, hoặc `out_of_scope` bằng LLM + Structured Output (Pydantic).
- **Entity Extraction:** Tự động trích xuất bộ lọc thành JSON chuẩn: khoảng giá (`max_price`, `min_price`), danh mục (`category`), màu sắc, kích cỡ...
- **Sliding Window:** Chỉ truyền 6 tin nhắn gần nhất vào prompt để tối ưu context.

### 🔍 Node 2 — Tìm kiếm Lai (Hybrid Search)

- **Pre-filtering (Lọc cứng):** Áp dụng SQL `WHERE` trên `price` và `category` để thu hẹp không gian tìm kiếm trước.
- **Lexical Search (BM25-style):** Tìm kiếm khớp từ khóa bằng `ILIKE` trên PostgreSQL.
- **Semantic Search (Vector):** Nhúng truy vấn bằng `paraphrase-multilingual-MiniLM-L12-v2`, so sánh `cosine_distance` qua `pgvector`.
- **RRF Merge:** Kết hợp ưu tiên cả hai kết quả bằng **Reciprocal Rank Fusion** để lấy top 5 sản phẩm cuối cùng.

### 🗣️ Node 3 — Sinh câu trả lời có kiểm soát

- **Anti-Hallucination:** Prompt ràng buộc AI chỉ được phép tư vấn dựa trên danh sách sản phẩm thực từ Database.
- **Call-to-Action:** Tự động chèn link sản phẩm và kêu gọi hành động mua sắm.
- **Kết quả đóng gói:** Toàn bộ conversation history được lưu vào `ChatMessage` để phục vụ RLHF ở Giai đoạn 2.

> **Điểm khác biệt:** Tách bạch hoàn toàn "Não phân tích" (Node 1 & 3) và "Mắt xích tìm kiếm" (Node 2) giúp triệt tiêu rủi ro AI báo sai giá, đồng thời toàn bộ luồng suy nghĩ được đóng gói cho Giai đoạn 2 đánh giá.

---

## ⚖️ Giai đoạn 2 — Quy trình RLHF (Human-in-the-Loop)

> **Mục tiêu cốt lõi:** Tạo bộ dữ liệu Preference Data siêu sạch phục vụ **DPO (Direct Preference Optimization)**.

### 🤖 1. AI Re-Evaluation

- AI tự động bóc tách cảm xúc từ `Feedback.comment` và `Feedback.rating` (1–5 sao).
- AI tự đối chiếu câu trả lời với feedback. Hệ thống **chỉ tạo Task** khi AI xác nhận có sai sót (thường 1–3 sao).
- Cơ chế Pre-check loại trừ feedback spam/troll trước khi khởi tạo Task.

### 👨‍💻 2. Triple-Blind Review

Task hợp lệ được phân phối ngẫu nhiên cho **3 Member độc lập** để đảm bảo tính khách quan.

### 🎯 3. Đánh giá đa tiêu chí

Mỗi Member chấm điểm trên 4 ma trận:

| Ma trận | Mô tả |
|---------|--------|
| `[Following]` | Mức độ tuân thủ Prompt / ràng buộc |
| `[Grounded]` | Độ xác thực dựa trên Context (kiểm soát ảo giác) |
| `[Useful]` | Tính thiết thực & giá trị giải quyết vấn đề |
| `[Harmful]` | An toàn nội dung, không vi phạm chính sách |

### ⚔️ 4. Kiểm soát Đồng thuận

- ✅ **Đồng thuận 100%** — 3 Member chung kết quả → Task tự động đóng, đưa vào tập `Gold Standard`.
- ⚠️ **Xung đột** — Bất kỳ sai lệch nào → Task bị khóa. Admin review trực tiếp bằng `Inline Editing` và chốt kết quả Final.

### ⚖️ 5. Hệ thống Điểm Uy tín

- **Auto-Scoring:** Tự động đối chiếu bài của từng Member với đáp án Final.
- **Penalty:** Trừ `trust_score` đối với Labeler đánh giá sai, hời hợt — duy trì đội ngũ QA chất lượng cao.

---

## 🛠️ Công nghệ sử dụng

### Backend

| Công nghệ | Vai trò |
|-----------|---------|
| **Python 3.11+** | Ngôn ngữ lập trình chính |
| **FastAPI** | REST API framework |
| **LangGraph** | State machine cho AI Chatbot |
| **SQLModel / SQLAlchemy** | ORM cho PostgreSQL |
| **pgvector** | Semantic search vector |
| **JWT (python-jose, passlib)** | Xác thực & phân quyền |
| **Gemini API / Groq API** | LLM inference |
| **Sentence Transformers** | Embedding model (`paraphrase-multilingual-MiniLM-L12-v2`) |

### Frontend

| Công nghệ | Vai trò |
|-----------|---------|
| **React 19** | UI framework |
| **Vite 7** | Build tool |
| **React Router DOM 7** | Client-side routing |
| **Axios** | HTTP client |
| **Chart.js** | Dashboard analytics |
| **React Markdown** | Render markdown messages |
| **React Icons** | Icon library |
| **SASS** | CSS preprocessor |

### Database & Infrastructure

| Công nghệ | Vai trò |
|-----------|---------|
| **PostgreSQL + pgvector** | Database + Vector store |
| **Docker Compose** | Container orchestration |

---

## 🔐 Phân quyền hệ thống (JWT Roles)

| Role | Mô tả |
|------|-------|
| `customer` | Khách hàng mua sắm, xem đơn hàng |
| `seller` | Người bán quản lý shop |
| `member` | Người gán nhãn RLHF |
| `admin` | Quản trị viên RLHF, giám sát & chốt kết quả |

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu

- Python 3.11+
- Node.js 18+
- Docker Desktop (cho PostgreSQL + pgvector)
- API Keys: `GOOGLE_API_KEY`, `GROQ_API_KEY`, `SUPABASE_KEY` (đã cấu hình trong `.env`)

### 1. Khởi động Database

```bash
docker compose up -d
```

### 2. Backend

```bash
cd shope
pip install -r requirements.txt
cd src/backend
uvicorn main:app --reload --port 8000
```

API docs sẽ có sẵn tại: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd src/frontend
npm install
npm run dev
```

Ứng dụng chạy tại: `http://localhost:5173`

### 4. Import dữ liệu mẫu

```bash
cd src/backend
python -m scripts.import_data
```

---

## 📡 API Endpoints chính

### Chatbot & AI

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/chat/` | Gửi tin nhắn chatbot (LangGraph pipeline) |
| `POST` | `/feedback/` | Gửi feedback sau khi chat |
| `GET` | `/feedback/{thread_id}` | Lấy feedback theo cuộc hội thoại |

### Sản phẩm & Tìm kiếm

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/products/` | Danh sách sản phẩm (hybrid search) |
| `POST` | `/products/` | Tạo sản phẩm mới |
| `GET` | `/products/{id}` | Chi tiết sản phẩm |
| `PUT` | `/products/{id}` | Cập nhật sản phẩm |
| `DELETE` | `/products/{id}` | Xóa sản phẩm |

### Giỏ hàng & Đơn hàng

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/cart/` | Lấy giỏ hàng hiện tại |
| `POST` | `/cart/` | Thêm sản phẩm vào giỏ |
| `PUT` | `/cart/{id}` | Cập nhật số lượng |
| `DELETE` | `/cart/{id}` | Xóa khỏi giỏ hàng |
| `POST` | `/orders/` | Tạo đơn hàng |
| `GET` | `/orders/` | Danh sách đơn hàng |

### RLHF (Admin & Member)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `GET` | `/tasks/` | Danh sách Task gán nhãn |
| `POST` | `/tasks/` | Admin tạo Task |
| `GET` | `/task-results/` | Lấy kết quả gán nhãn |
| `POST` | `/task-results/` | Member nộp kết quả |
| `GET` | `/final-results/` | Kết quả cuối cùng (Admin chốt) |
| `POST` | `/final-results/` | Admin tạo Final Result |

### Kênh người bán

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/seller/register` | Đăng ký kênh người bán |
| `GET` | `/seller/dashboard` | Dashboard người bán |
| `POST` | `/seller/voucher/` | Tạo voucher shop |
| `GET` | `/seller/analytics/` | Thống kê doanh thu |

---

## 📊 Database Models chính

```
Customer ──► CartItem ──► Product
    │
    └──► Order ──► OrderItem ──► Product

Seller ──► Product ──► Product_Variants / Product_image
    │
    └──► Voucher

ChatMessage (thread_id, role, content, suggested_product_ids)
Feedback (thread_id, rating, comment, ai_score, sentiment, process_status)
User (admin/member) ──► Task ──► TaskResult ──► FinalResult
```

Vector embedding được lưu trong `Product.embedding` (Vector(384)) hỗ trợ semantic search.

---

## 🔑 Các tính năng nổi bật

- **Chatbot AI tự sửa lỗi** — Mỗi feedback của khách được AI tự đánh giá lại trước khi tạo Task RLHF.
- **Hybrid Search không phụ thuộc VectorDB ngoài** — Tích hợp trực tiếp trong PostgreSQL qua `pgvector`.
- **RRF Reranking** — Kết hợp Lexical + Semantic cho kết quả tìm kiếm tối ưu.
- **Triple-Blind Review** — Đảm bảo tính khách quan tuyệt đối trong gán nhãn.
- **Điểm Uy tín (Trust Score)** — Cơ chế penalty tự động duy trì chất lượng đội ngũ gán nhãn.
- **Preference Dataset cho DPO** — Đầu ra sẵn sàng để fine-tune LLM bằng Direct Preference Optimization.

---

## 📌 Ghi chú

- `.env` chứa các API keys (`GOOGLE_API_KEY`, `GROQ_API_KEY`, `SUPABASE_KEY`) — **không commit file này**.
- Database sử dụng `pgvector` extension, đảm bảo PostgreSQL đã bật extension này trước khi chạy.
- Embedding model `paraphrase-multilingual-MiniLM-L12-v2` được cache trong RAM (`st.cache_resource`) để tránh tải lại nhiều lần.
- Các role `member` và `admin` được quản lý trong bảng `User`; `customer` và `seller` có bảng riêng (`Customer`, `Seller`).
