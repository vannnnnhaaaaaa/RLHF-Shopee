Nền tảng Điều phối AI & Gán nhãn Dữ liệu (Agentic RAG + RLHF Platform)
Một hệ thống toàn diện kết hợp giữa Agentic Workflow (AI tự động xử lý) và Human-in-the-Loop (Con người kiểm duyệt). Dự án được thiết kế để tự động hóa việc truy xuất thông tin (RAG), tự sửa lỗi, sau đó thu thập ý kiến đồng thuận của con người (Human Feedback) nhằm phục vụ cho quá trình tinh chỉnh các mô hình ngôn ngữ lớn (RLHF).

GIAI ĐOẠN 1: Luồng suy nghĩ của AI (AI Orchestration với LangGraph)Trước khi đưa cho con người gán nhãn, hệ thống sử dụng LangGraph để xây dựng một "Bộ não" (State Machine) giúp AI phân tích câu hỏi, tự tìm kiếm và tự đánh giá chất lượng tài liệu. Quá trình này đi qua các Node (nút trạm) cụ thể:
1 . Khởi tạo & Phân luồng (Init Node & Routing): * AI tiếp nhận câu hỏi và kiểm tra xem người dùng đang muốn "Chat phiếm" hay "Tìm kiếm kiến thức".
2 . Hiểu Ngữ cảnh (Rewrite Node): * Nếu đang trong một cuộc hội thoại dài, AI sẽ tự động đọc lại lịch sử (chat_history) và viết lại câu hỏi sao cho rõ nghĩa nhất trước khi đi tìm kiếm.
3 . Truy xuất & Tự chấm điểm (Retriever & Grader Node): * AI tiến hành tìm kiếm tài liệu (RAG). Điểm đặc biệt là AI sẽ tự chấm điểm (Grader) tài liệu vừa tìm được.
4 . Vòng lặp tự sửa lỗi (Self-Correction Logic): * Nếu điểm chất lượng tài liệu $< 0.8$, AI tự nhận thấy "Thông tin này chưa đủ tốt" và kích hoạt vòng lặp: Tăng biến đếm retry_count $\rightarrow$ Sửa lại từ khóa $\rightarrow$ Tìm kiếm lại (tối đa 2 lần để tiết kiệm chi phí).
5 . Tổng hợp & Trả lời (Selector & Generate Node): * Chọn lọc những thông tin tốt nhất sau các vòng lặp và sinh ra câu trả lời cuối cùng.$\rightarrow$ Toàn bộ "vết suy nghĩ" của AI (số lần thử, điểm số tài liệu, bối cảnh) sẽ được lưu lại làm dữ liệu đầu vào cho con người đánh giá ở Giai đoạn 2.

GIAI ĐOẠN 2: Kiểm duyệt & Gán nhãn (Human-in-the-loop / RLHF)
Sau khi AI sinh ra câu trả lời, Task sẽ được tự động đẩy vào Nền tảng Gán nhãn (RLHF Platform) để con người kiểm duyệt chất lượng dữ liệu thông qua các cơ chế:
 - Phân phối Task & Chấm chéo (Consensus Mechanism): 3 Member (Annotators) độc lập sẽ nhận cùng một câu trả lời của AI và đánh giá theo 4 tiêu chí: Following (Bám sát), Grounded (Có cơ sở), Useful (Hữu ích), Harmful (Độc hại).
 - Theo dõi & Chống gian lận (Quality Control): Hệ thống tích hợp Time Tracking để đo lường thời gian thực làm (Active Time), ngăn chặn việc Member click bừa để lấy số lượng.
 - Tự động xử lý Xung đột (Conflict Resolution): Nếu kết quả chấm của 3 Member không giống nhau, hệ thống tự động khóa Task và đẩy vào luồng "Conflict" chờ Admin can thiệp.
 - Phán quyết cuối cùng (Gold Standard): Admin có một Dashboard riêng để nhìn thấy bối cảnh gốc, luồng suy nghĩ của AI, và đối chiếu 3 bản nháp của Member. Admin có quyền sửa trực tiếp vào văn bản (Inline Editing) và chốt ra bộ dữ liệu sạch 100%.
 - Chấm điểm uy tín (Auto-Scoring): Hệ thống tự động so sánh bài làm của Member với kết quả chốt của Admin để tính điểm độ tin cậy ($\text{Accuracy Rate}$) cho từng người.
Công nghệ sử dụng (Tech Stack)
AI & LLM Framework: LangChain, LangGraph (State Graph, Conditional Edges).
Backend: Python, FastAPI.
Database: PostgreSQL (quản lý qua ORM SQLModel / SQLAlchemy).
Frontend: HTML5, CSS3, Vanilla JavaScript.
Data Visualization: Chart.js (Dashboard thống kê hiệu suất người gán nhãn).
Security: Phân quyền Admin / Member bằng JWT Bearer Tokens.

Cách Cài đặt & Khởi chạy
Clone repository:
git clone https://github.com/vannnnnhaaaaaa/RLHF-Shopee.git
cd RLHF-Shopee

python -m venv venv
source venv/bin/activate  # (Với Windows: venv\Scripts\activate)
pip install -r requirements.txt

uvicorn src.back_end.main:app --reload
