from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime, timezone

from src.backend.connect_database import get_session
from src.backend.auth import get_current_seller
from src.backend.models import Seller, Voucher
# Bạn nhớ cập nhật tên Schema trong file schemas.py cho khớp nhé
from src.backend.schemas import  SellerVoucherCreate , VoucherResponse

router_seller_voucher = APIRouter(prefix="/seller/vouchers", tags=["Seller Voucher"])

# =====================================================================
# 1. POST /seller/vouchers/create — Tạo voucher mới bởi Seller
# =====================================================================
@router_seller_voucher.post("/create", response_model=dict)
def create_voucher(
    voucher_data: SellerVoucherCreate,
    current_seller: Seller = Depends(get_current_seller),
    session: Session = Depends(get_session),
):
    """
    Tạo voucher mới cho người bán hiện tại.
    Sử dụng bảng Voucher chung, tự động gán creator_type = 'seller'.
    """
    try:
        # 1. Kiểm tra mã code đã tồn tại chưa
        existing = session.exec(
            select(Voucher).where(Voucher.code == voucher_data.code.upper())
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Mã voucher này đã tồn tại trên hệ thống. Vui lòng chọn mã khác."
            )

        # 2. Validate thời gian 
        start_dt = voucher_data.valid_from
        end_dt = voucher_data.valid_until
        
        # [FIX 1]: Kiểm tra ngày kết thúc phải sau ngày bắt đầu
        if end_dt <= start_dt:
            raise HTTPException(
                status_code=400,
                detail="Ngày kết thúc phải lớn hơn ngày bắt đầu."
            )
        
        if end_dt.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="Ngày kết thúc (valid_until) không được nằm trong quá khứ."
            )

        # 3. Validate discount_type
        if voucher_data.discount_type not in ("percent", "fixed"):
            raise HTTPException(
                status_code=400,
                detail="discount_type chỉ nhận giá trị 'percent' hoặc 'fixed'."
            )

        # 4. Validate giá trị giảm
        if voucher_data.discount_value <= 0:
            raise HTTPException(
                status_code=400,
                detail="Mức giảm phải lớn hơn 0."
            )
            
        # Giới hạn phần trăm không được vượt quá 100%
        if voucher_data.discount_type == "percent" and voucher_data.discount_value > 100:
            raise HTTPException(
                status_code=400,
                detail="Mức giảm theo phần trăm không được vượt quá 100%."
            )
        
        # Nếu là fixed thì max_discount ép về None cho sạch data
        if voucher_data.discount_type == "fixed":
            voucher_data.max_discount = None

        # 5. Khởi tạo Voucher mới
        new_voucher = Voucher(
            code=voucher_data.code.upper(),
            
            # Cấu hình "Định danh" voucher của Seller
            creator_type="seller",
            apply_to="product" if voucher_data.product_id else "shop",
            seller_id=current_seller.id,
            product_id=voucher_data.product_id, # Có thể None nếu áp dụng toàn shop
            
            # Cấu hình giá trị
            discount_type=voucher_data.discount_type,
            discount_value=voucher_data.discount_value,
            max_discount=voucher_data.max_discount,
            min_spend=voucher_data.min_spend,
            is_active=False,
            # Cấu hình số lượng & thời gian
            quantity=voucher_data.quantity,
            used_count=0,
            valid_from=start_dt, # [FIX 2]: Bổ sung truyền valid_from vào đây
            valid_until=end_dt
        )

        session.add(new_voucher)
        session.commit()
        session.refresh(new_voucher)

        return {
            "status": "success",
            "message": "Tạo voucher thành công.",
            "data": new_voucher.model_dump(), 
        }

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"Lỗi create_voucher: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi tạo voucher.")


# =====================================================================
# 2. GET /seller/vouchers/list — Lấy danh sách voucher của Seller
# =====================================================================
# [FIX TẠI ĐÂY]: Đổi response_model thành dict để khớp với cấu trúc return ở dưới
@router_seller_voucher.get("/list", response_model=dict)
def list_vouchers(
    limit: int = 10,
    offset: int = 0,
    current_seller: Seller = Depends(get_current_seller),
    session: Session = Depends(get_session),
):
    """
    Lấy danh sách voucher do chính người bán hiện tại tạo.
    Hỗ trợ phân trang và ép kiểu dữ liệu chuẩn qua Pydantic.
    """
    try:
        # Đếm tổng số voucher của seller này
        count_stmt = select(func.count()).select_from(Voucher).where(
            Voucher.seller_id == current_seller.id,
            Voucher.creator_type == "seller"
        )
        total = session.exec(count_stmt).one()

        # Lấy danh sách phân trang, sắp xếp mới nhất lên đầu
        stmt = (
            select(Voucher)
            .where(
                Voucher.seller_id == current_seller.id,
                Voucher.creator_type == "seller"
            )
            .order_by(Voucher.id.desc())
            .offset(offset)
            .limit(limit)
        )
        vouchers = session.exec(stmt).all()

        # [FIX TẠI ĐÂY]: Cho từng voucher chạy qua VoucherResponse để lọc data rác (nếu có)
        # sau đó biến nó thành dạng dict an toàn để gửi về Frontend.
        data_list = [VoucherResponse.model_validate(v).model_dump() for v in vouchers]

        return {
            "status": "success",
            "data": data_list,
            "metadata": {
                "total": total,
                "limit": limit,
                "offset": offset,
            },
        }

    except Exception as e:
        print(f"Lỗi list_vouchers: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi lấy danh sách voucher.")
# =====================================================================
# 3. PUT /seller/vouchers/{voucher_id}/toggle — Bật/Tắt Voucher
# =====================================================================
@router_seller_voucher.put("/{voucher_id}/toggle", response_model=dict)
def toggle_voucher_status(
    voucher_id: int,
    current_seller: Seller = Depends(get_current_seller),
    session: Session = Depends(get_session),
):
    """
    Bật/tắt trạng thái (is_active) của một voucher.
    Bảo mật: Chỉ cho phép Seller thao tác với voucher do chính họ tạo ra.
    """
    try:
        # 1. Tìm voucher trong Database
        voucher = session.get(Voucher, voucher_id)

        # 2. Kiểm tra tồn tại
        if not voucher:
            raise HTTPException(status_code=404, detail="Không tìm thấy voucher này trong hệ thống.")

        # 3. Kiểm tra quyền sở hữu (BẢO MẬT QUAN TRỌNG)
        # Ép buộc voucher này phải thuộc về seller đang login VÀ do chính seller tạo ra
        if voucher.seller_id != current_seller.id or voucher.creator_type != "seller":
            raise HTTPException(
                status_code=403,
                detail="Truy cập bị từ chối. Bạn không có quyền thao tác với voucher của shop khác hoặc của sàn."
            )

        # 4. Thực hiện lệnh Đảo ngược trạng thái (Toggle)
        # Nếu True -> False, Nếu False -> True
        voucher.is_active = not voucher.is_active
        
        # 5. Lưu lại xuống Database
        session.add(voucher)
        session.commit()
        session.refresh(voucher)

        # Trả về nhãn trạng thái để Frontend tiện hiển thị thông báo
        status_label = "BẬT" if voucher.is_active else "TẮT"
        
        return {
            "status": "success",
            "message": f"Đã {status_label} voucher thành công.",
            "data": voucher.model_dump(), # Hoặc VoucherResponse.model_validate(voucher) nếu bạn có dùng schema
        }

    # Bắt lại lỗi HTTP để ném thẳng ra Frontend
    except HTTPException:
        raise
    except Exception as e:
        session.rollback() # Hoàn tác nếu có lỗi DB
        print(f"Lỗi ở hàm toggle_voucher_status: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi cập nhật trạng thái voucher.")