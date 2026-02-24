# 🎯 Nền tảng Đánh giá & Gán nhãn Dữ liệu AI (RLHF Platform)

Một hệ thống **Human-in-the-Loop (HITL)** chuyên nghiệp được thiết kế để thu thập, so sánh và kiểm duyệt phản hồi của con người (Human Feedback) nhằm phục vụ cho quá trình tinh chỉnh các mô hình ngôn ngữ lớn (RLHF - Reinforcement Learning from Human Feedback).



## 🚀 Tính năng Cốt lõi (Key Features)

Hệ thống được thiết kế để giải quyết bài toán kiểm soát chất lượng dữ liệu trong Crowdsourcing thông qua các cơ chế sau:

* **Phân phối Task thông minh:** Tự động giao việc cho các Member (Annotators) và theo dõi trạng thái tiến độ.
* **Cơ chế Đồng thuận (Consensus Mechanism):** Đảm bảo tính khách quan bằng cách cho phép 3 Member độc lập đánh giá cùng một hội thoại AI (đo lường các chỉ số: *Following, Grounded, Useful, Harmful*).
* **Xử lý Xung đột (Conflict Resolution):** Khi có sự bất đồng giữa các Member, hệ thống tự động đẩy Task vào danh sách Conflict để Admin can thiệp.
* **Quản lý Chất lượng (Quality Control):**
    * **Time Tracking:** Theo dõi *Active Time* và *Idle Time* của người gán nhãn để chống gian lận.
    * **Auto-Scoring:** Tự động tính điểm độ tin cậy của Member dựa trên tỷ lệ khớp với đáp án chuẩn.
    * Công thức tính: $\text{Accuracy} = \frac{\text{Số tiêu chí khớp với Admin}}{\text{Tổng số tiêu chí}} \times 100\%$
* **Tiêu chuẩn Vàng (Gold Standard):** Cho phép Admin so sánh đa góc nhìn, tinh chỉnh trực tiếp (Inline Editing) và chốt bộ dữ liệu cuối cùng (FinalResult) hoàn toàn sạch để đưa vào huấn luyện AI.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

* **Backend:** Python, FastAPI
* **Database:** SQLite / PostgreSQL (quản lý qua SQLModel / SQLAlchemy)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript 
* **Data Visualization:** Chart.js (Dashboard thống kê hiệu suất)
* **Authentication:** JWT Bearer tokens (Phân quyền Admin / Member)

---

## 🔄 Luồng hoạt động (Workflow)

1.  **Nạp dữ liệu:** Hệ thống nạp các đoạn hội thoại gốc (Thread/Messages) giữa User và AI.
2.  **Đánh giá:** 3 Member khác nhau tiếp nhận Task và chấm điểm AI trên giao diện độc lập.
3.  **Cross-check:** Hệ thống đối chiếu kết quả. Nếu giống nhau -> Chấp nhận. Nếu khác biệt -> Chuyển trạng thái Conflict.
4.  **Phán quyết:** Admin vào màn hình Review, đọc bối cảnh gốc, xem đối chiếu 3 bản nháp và thực hiện hiệu chỉnh trực tiếp.
5.  **Xuất bản:** Lưu dữ liệu vào bảng `FinalResult` (Gold Standard) sẵn sàng cho MLOps pipeline.

---



