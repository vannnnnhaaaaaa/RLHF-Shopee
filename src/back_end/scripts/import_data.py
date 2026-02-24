import re 
import pandas as pd
import os
import sys
from sqlmodel import Session, select

# --- IMPORT CÁC MODULE ---
from src.back_end.config import  RAW_DATA
from src.back_end.connect_database import init, engine
from src.back_end.models import Product
from src.back_end.services.ai_engine import  get_model_embedding

model = get_model_embedding()


# --- 1. HÀM XỬ LÝ GIÁ (CHUẨN VN) ---
def clean_price(price_raw):
    if pd.isna(price_raw) or str(price_raw).strip() == "":
        return 0
    s = str(price_raw).lower().replace('đ', '').replace('vnd', '').strip()
    
    if '-' in s:
        s = s.split('-')[0].strip()
    
    # Trường hợp: 1.5tr, 100k -> Dấu chấm là thập phân
    if any(unit in s for unit in ['k', 'm', 'tr']):
        multiplier = 1
        if 'k' in s: multiplier = 1000
        if 'm' in s or 'tr' in s: multiplier = 1000000
        
        s_clean = re.sub(r'[^\d.,]', '', s)
        s_clean = s_clean.replace(',', '.') 
        
        try:
            return int(float(s_clean) * multiplier)
        except:
            return 0

    # Trường hợp: 10.000 (Số thường) -> Dấu chấm là hàng nghìn -> Xóa
    else:
        s_clean = re.sub(r'[.,]', '', s)
        try:
            return int(s_clean)
        except:
            return 0

# --- 2. HÀM XỬ LÝ STOCK (QUÉT RADAR) ---
def extract_smart_sold(row):
    sold_text = ""
    # Quét tất cả các cột để tìm chữ 'đã bán'
    for col_name, value in row.items():
        text_val = str(value).lower()
        if "đã bán" in text_val:
            sold_text = text_val
            break 
            
    if not sold_text: return 0

    try:
        s = sold_text.replace("đã bán", "").strip()
        
        multiplier = 1
        if 'k' in s:
            multiplier = 1000
            s = s.replace('k', '')
        elif 'm' in s or 'tr' in s:
            multiplier = 1000000
            s = s.replace('m', '').replace('tr', '')
            
        s = s.replace(',', '.') 
        s = s.replace('+', '')
        
        match = re.search(r"(\d+(\.\d+)?)", s)
        if match:
            number = float(match.group(1))
            return int(number * multiplier)
    except Exception:
        return 0
    return 0

# --- 3. HÀM CHẠY TOÀN BỘ (ALL FILES) ---
def load_all_shopee_data():
    print(f"-- --- CHẾ ĐỘ: QUÉT TOÀN BỘ DỮ LIỆU --- --")
    print(f"📂 Thư mục nguồn: {RAW_DATA}")
    init()

    
    try:
        all_files = sorted([f for f in os.listdir(RAW_DATA) if f.endswith('.csv')])
        print(f"📦 Tìm thấy tổng cộng: {len(all_files)} file CSV.")
    except Exception as e:
        print(f"❌ Lỗi đường dẫn RAW_DATA: {e}")
        return

    
    print("⏳ Đang tải danh sách link cũ từ Database...")
    with Session(engine) as session:
        existing_links = set(session.exec(select(Product.product_link)).all())
    print(f"✅ Đã cache {len(existing_links)} link sản phẩm.")

    
    for filename in all_files:
        file_path = os.path.join(RAW_DATA, filename)
        category = filename.replace("shopee_" , "").replace('.csv' , '').replace("_" , " ").title().strip()
        
        try:
            print(f"\n🚀 Đang xử lý: {filename}...")
           
            df = pd.read_csv(file_path, dtype=str) 
            
            descriptions_to_embed = []
            product_objects = []
            skipped_count = 0
            
            for _, row in df.iterrows():
                product_link = str(row.get('contents href', ''))
                
             
                if product_link in existing_links:
                    skipped_count += 1
                    continue 

                name = str(row.get('line-clamp-2')).strip() if not pd.isna(row.get('line-clamp-2')) else "Sản phẩm"
                
            
                price = clean_price(row.get('font-medium'))
                
                # Gọi hàm stock thông minh
                sold = extract_smart_sold(row) 
                
                desc = f"Sản phẩm {name}, giá bán {price:,.0f} vnđ, đã bán được {sold} sản phẩm."
                descriptions_to_embed.append(desc)
                
                new_Product = Product(
                    name=name,
                    price=price,
                    stock=sold,
                    description=desc,
                    image_link=str(row.get('inset-y-0 src', '')),
                    product_link=product_link,
                    category=category
                )
                product_objects.append(new_Product)
                existing_links.add(product_link) # Thêm vào cache để check dòng sau

            if product_objects:
                print(f"   ➤ Tìm thấy {len(product_objects)} sản phẩm MỚI.")
                # print(f"   🧠 Đang Vector hóa...")
                vector_des = model.encode(descriptions_to_embed)
                
                with Session(engine) as session:
                    for i, product in enumerate(product_objects):
                        product.embedding = vector_des[i].tolist()
                        session.add(product)
                    session.commit()
                print(f"   ✅ Đã nạp xong!")
            else:
                print(f"   💤 File này đã có đủ {skipped_count} sản phẩm trong DB. Bỏ qua.")

        except Exception as e:
            print(f"❌ Lỗi khi đọc file {filename}: {e}")

    print("\n🎉🎉🎉 HOÀN TẤT QUY TRÌNH NẠP DỮ LIỆU! 🎉🎉🎉")


def load_table () :
    print("tạo bảng bên supabase")
    init()

if __name__ == '__main__':
    load_table()
   # load_all_shopee_data()