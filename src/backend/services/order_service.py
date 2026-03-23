from sqlmodel import select, Session
# Đã đổi BillItem thành BillDetail
from src.backend.models import Bill, BillDetail, Product 

def get_bill_customer(status: str, current_id: int, session: Session, limit: int = 7, offset: int = 0):
    try:
        normalized_status = status.upper()

        # ==========================================
        # BƯỚC 1: LẤY DANH SÁCH BILL (Có phân trang chuẩn)
        # ==========================================
        statement_bill = select(Bill).where(Bill.customer_id == current_id)
        
        if normalized_status != 'ALL':
            statement_bill = statement_bill.where(Bill.status == normalized_status)
        statement_bill = statement_bill.order_by(Bill.created_at.desc())
        # Limit và Offset ở đây sẽ chuẩn xác là đếm số lượng Bill
        statement_bill = statement_bill.limit(limit).offset(offset)
        bills = session.exec(statement_bill).all()

        # Nếu không có bill nào, ngưng luôn và trả về mảng rỗng
        if not bills:
            return []

        # ==========================================
        # BƯỚC 2: JOIN LẤY SẢN PHẨM TỪ BILLDETAIL VÀ PRODUCT
        # ==========================================
        # Lấy danh sách các ID của Bill vừa tìm được
        bill_ids = [b.id for b in bills]

        # Query JOIN giữa BillDetail và Product
        statement_items = select(BillDetail, Product).join(
            Product, BillDetail.product_id == Product.id
        ).where(
            BillDetail.bill_id.in_(bill_ids) # Chỉ lấy item của những bill đang hiển thị
        )
        
        # Kết quả trả về là list các tuple: [(BillDetail, Product), (BillDetail, Product)...]
        item_results = session.exec(statement_items).all()

        # ==========================================
        # BƯỚC 3: GOM NHÓM DỮ LIỆU THÀNH JSON CHO REACT
        # ==========================================
        # Tạo một dictionary để nhét items vào đúng bill của nó
        bill_dict = {
            bill.id: {
                **bill.model_dump(), # Lấy toàn bộ info của Bill (total_price, status...)
                "items": []          # Tạo sẵn mảng rỗng để hứng sản phẩm
            }
            for bill in bills
        }

        # Lặp qua kết quả JOIN để nhét sản phẩm vào mảng items tương ứng
        for bill_detail, product in item_results:
            bill_dict[bill_detail.bill_id]["items"].append({
                "product_id": product.id,
                "product_category" : product.category ,
                "product_name": product.name,       # Bạn kiểm tra lại model Product xem tên cột có đúng là name không nhé
                "product_image": product.image_link, # Bạn kiểm tra lại model Product xem tên cột ảnh là gì nhé
                "quantity": bill_detail.quantity,
                "price": bill_detail.price_at_purchase # Cập nhật đúng trường price_at_purchase của bạn
            })

        # Trả về một mảng chứa các object hoàn chỉnh
        return list(bill_dict.values())
        
    except Exception as e:
        raise Exception(f"Database Error: {e}")