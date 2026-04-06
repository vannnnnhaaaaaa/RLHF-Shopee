import os
import psutil
import time

# Hàm nhỏ để đo RAM của chính file Python này đang chạy
def check_ram():
    process = psutil.Process(os.getpid())
    # Lấy thông số RAM hiện tại (tính bằng Byte) rồi đổi ra Megabyte (MB)
    ram_mb = process.memory_info().rss / (1024 * 1024)
    print(f"[HỆ THỐNG] RAM đang sử dụng: {ram_mb:.2f} MB")

print("=== BƯỚC 1: TRƯỚC KHI LOAD MODEL ===")
check_ram()
time.sleep(2)

print("\n=== BƯỚC 2: ĐANG LOAD MODEL VÀO RAM... ===")
# Giả lập Load AI Model khổng lồ (Sẽ ngốn khoảng 150MB - 200MB RAM)
fake_ai_model = [0.0] * 40_000_000 
check_ram()
time.sleep(2)

print("\n=== BƯỚC 3A: NẾU CÓ YIELD (GIỮ NGUYÊN SESSION) ===")
print("Khách hàng chat: 'Áo này giá bao nhiêu?'")
print("AI lấy model từ RAM ra trả lời ngay lập tức!")
check_ram() # RAM vẫn giữ nguyên mức cao, sẵn sàng phục vụ khách tiếp theo
time.sleep(2)

print("\n=== BƯỚC 3B: NẾU KHÔNG CÓ YIELD (APP TẮT / XÓA MODEL) ===")
# Lệnh del dùng để xóa biến, ép Python giải phóng RAM
del fake_ai_model 
print("Đã xóa model AI khỏi bộ nhớ...")
check_ram() # RAM tụt về lại như Bước 1