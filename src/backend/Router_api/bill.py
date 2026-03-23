from fastapi import APIRouter, Depends, HTTPException 
from sqlmodel import Session ,select
from typing import Optional 

from src.backend.connect_database import get_session
from src.backend.schemas import CreateBill, ResponseBill , UpdateOrderStatusRequest , StatusBillbyCustomer
from src.backend.services.bill_service import create_checkout_bill
from src.backend.services.customer_service import check_exist_info_customer
from src.backend.auth import get_current_customer , get_current_seller
from src.backend.models import Bill , BillDetail , Product , Customer
router_bill = APIRouter(prefix="/bills", tags=["Bills"]) 



@router_bill.post("/add_bill")
def create_bill_endpoint(
    bill_data: CreateBill, 
    current_user = Depends(get_current_customer), 
    session: Session = Depends(get_session)
):
    if not check_exist_info_customer(current_user):
        raise HTTPException(
            status_code=400, 
            detail={"code": "MISSING_INFO", "message": "Vui lòng cập nhật đầy đủ thông tin giao hàng."}
        )
 
    try:
        # Bắt đầu tạo hóa đơn
        result = create_checkout_bill(bill_data=bill_data, customer_id=current_user.id, session=session)
        return result
    except HTTPException as http_exc:
        # THÊM ĐOẠN NÀY: Bắt các lỗi HTTP do mình chủ động raise (như 400 Hết hàng) và trả thẳng ra FE
        raise http_exc
    except Exception as e:
        # Lỗi hệ thống thực sự (sập DB, sai cú pháp code...) thì mới trả ra 500
        print(f"API Error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống không xác định")

@router_bill.get("/seller/get-bills")
def get_bills_for_seller(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller)
):
    try:
        seller_id = current_seller.id 
        
        # BƯỚC 1: Xây dựng câu lệnh JOIN 4 bảng
        statement = (
            select(
                Bill.id, 
                Bill.status, 
                Bill.total_price, 
                Bill.created_at, 
                Bill.payment_method,
                Customer.name.label("customer_name"), # Tên khách hàng
                Product.name.label("product_name"),   # Tên sản phẩm
                Product.image_link                    # Ảnh sản phẩm
            )
            .join(Customer, Bill.customer_id == Customer.id)
            .join(BillDetail, Bill.id == BillDetail.bill_id)
            .join(Product, BillDetail.product_id == Product.id)
            .where(Product.seller_id == seller_id)
        )

        if status:
            valid_statuses = ["PENDING","ACCEPT", "DELIVERING", "COMPLETED", "PROCESSING_CANCEL", "CANCELLED"]
            if status not in valid_statuses:
                raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ.")
            statement = statement.where(Bill.status == status)

        # Sắp xếp và phân trang
        statement = statement.order_by(Bill.id.desc()).offset(skip).limit(limit)

        # Thực thi query
        raw_results = session.exec(statement).all()

        # BƯỚC 2: Gom nhóm dữ liệu theo Bill ID
        formatted_bills = {}
        for row in raw_results:
            bill_id = row.id
            if bill_id not in formatted_bills:
                # Lần đầu tiên thấy Bill này -> Tạo mới dict
                formatted_bills[bill_id] = {
                    "id": bill_id,
                    "customer": getattr(row, "customer_name", "Khách hàng ẩn"), # Trả về tên khách hàng
                    "status": row.status,
                    "shippingMethod": row.payment_method,
                    "total": row.total_price, # Trả về tổng tiền
                    "date": row.created_at.strftime("%d/%m/%Y") if row.created_at else "",
                    "base_product_name": getattr(row, "product_name", ""), # Lưu tên SP đầu tiên làm gốc
                    "productImage": row.image_link,
                    "items_count": 1 # Khởi tạo biến đếm số lượng mặt hàng
                }
            else:
                # Nếu đã có Bill này rồi -> Chỉ tăng biến đếm, không sửa chuỗi string ở đây
                formatted_bills[bill_id]["items_count"] += 1

        # BƯỚC 3: Format lại tên sản phẩm hiển thị trước khi trả về
        final_data = []
        for bill in formatted_bills.values():
            count = bill["items_count"]
            base_name = bill["base_product_name"]
            
            # Xử lý logic hiển thị tên sản phẩm
            if count > 1:
                bill["productName"] = f"{base_name} và {count - 1} sản phẩm khác"
            else:
                bill["productName"] = base_name
                
            # Xóa các key tạm thời không cần thiết gửi cho Frontend
            bill.pop("base_product_name", None)
            bill.pop("items_count", None)
            
            final_data.append(bill)

        return {
            "status": "success",
            "message": "Lấy danh sách đơn hàng thành công",
            "data": final_data
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi truy vấn get-bills: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")


@router_bill.put("/seller/update-status/{bill_id}")
def update_order_status(
    bill_id: int,
    request: UpdateOrderStatusRequest, 
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller)
):
    """
    API Cập nhật trạng thái đơn hàng dành cho Seller
    """
    try:
        # BƯỚC 1: Tìm đơn hàng trong DB
        bill = session.get(Bill, bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng này.")

        # BƯỚC 2: Kiểm tra bảo mật
        statement = (
            select(BillDetail)
            .join(Product, BillDetail.product_id == Product.id)
            .where(BillDetail.bill_id == bill_id)
            .where(Product.seller_id == current_seller.id)
        )
        seller_items = session.exec(statement).first()
        
        if not seller_items:
            raise HTTPException(
                status_code=403, 
                detail="Bạn không có quyền cập nhật trạng thái cho đơn hàng này."
            )

        # BƯỚC 3: Kiểm tra trạng thái
        valid_statuses = ["pending", "accept", "delivering", "completed", "processing_cancel", "cancelled"]
        if request.status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ.")

        # BƯỚC 4: Cập nhật DB
        bill.status = request.status
        session.add(bill)
        session.commit()
        session.refresh(bill)

        return {
            "status": "success",
            "message": "Cập nhật trạng thái đơn hàng thành công!",
            "data": {
                "bill_id": bill.id,
                "new_status": bill.status
            }
        }

    except HTTPException:
        raise 
    except Exception as e:
        print(f"Lỗi khi cập nhật trạng thái đơn {bill_id}: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi cập nhật đơn hàng.")


