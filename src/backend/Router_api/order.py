from fastapi import APIRouter, Depends, HTTPException 
from sqlmodel import Session, select
from typing import Optional 

from src.backend.connect_database import get_session
# Lưu ý: Hãy chắc chắn bạn đã đổi tên các schema từ Bill sang Order trong file schemas.py nhé
from src.backend.schemas import CreateOrder, ResponseOrder, StatusOrderbyCustomer , CheckoutPreviewRequest
from src.backend.services.order_service import create_checkout_orders, get_customer_orders , update_status_logic, get_seller_dashboard_stats
from src.backend.services.customer_service import check_exist_info_customer
from src.backend.services.notification_service import create_order_status_notification
from src.backend.auth import get_current_customer, get_current_seller
# Đã đổi tên Model từ Bill -> Order, BillDetail -> OrderItem
from src.backend.models import Order, OrderItem, Product, Customer ,CartItem

router_order = APIRouter(prefix="/orders", tags=["Orders"]) 

# =====================================================================
# 1. NHÓM API DÀNH CHO NGƯỜI MUA (CUSTOMER)
# =====================================================================
@router_order.post("/checkout/preview")
def preview_checkout_logic(
    request: CheckoutPreviewRequest,
    current_user = Depends(get_current_customer),
    session: Session = Depends(get_session)
):
    """
    API Tính toán chi phí trước khi Đặt hàng.
    Frontend gửi mảng cart_ids đã chọn -> Backend tính tiền hàng, tiền ship và gom nhóm theo Shop.
    """
    try:
        # 1. Truy vấn các CartItem khớp với danh sách ID gửi lên và phải thuộc về current_user
        statement = (
            select(CartItem, Product)
            .join(Product, CartItem.product_id == Product.id)
            .where(CartItem.customer_id == current_user.id)
            .where(CartItem.id.in_(request.cart_ids))
        )
        results = session.exec(statement).all()

        if not results:
            raise HTTPException(
                status_code=400, 
                detail="Không tìm thấy sản phẩm nào hợp lệ trong giỏ hàng để thanh toán."
            )

        # 2. Khởi tạo biến để lưu trữ kết quả tính toán
        shops_dict = {}
        merchandise_subtotal = 0
        shipping_fee_per_shop = 14000  # Giả sử phí ship đồng giá 14k/Shop. (Sau này có thể viết logic tính theo km ở đây)

        # 3. Quét qua dữ liệu để tính toán và gom nhóm
        for cart_item, product in results:
            shop_id = getattr(product, 'seller_id', 1)
            
            # --- FIX TRỊÊT ĐỂ LỖI NoneType TẠI ĐÂY ---
            original_price = product.price or 0
            # Ép kiểu an toàn: Nếu DB trả về NULL (None), nó sẽ nhận giá trị 0
            discount_percent = getattr(product, 'discount_percent', 0) or 0
            stock_count = getattr(product, 'stock', 0) or 0
            
            if discount_percent > 0:
                final_price = round(original_price * (1 - discount_percent / 100))
            else:
                final_price = original_price

            # Cộng dồn tiền hàng
            item_subtotal = final_price * cart_item.quantity
            merchandise_subtotal += item_subtotal

            # Tạo khung Shop nếu chưa có
            if shop_id not in shops_dict:
                shops_dict[shop_id] = {
                    "shop_id": shop_id,
                    "shop_name": f"Shop của Người bán {shop_id}",
                    "shop_badge": "Yêu thích",
                    "shipping_fee": shipping_fee_per_shop,
                    "items": []
                }
                
            # Đẩy item vào Shop tương ứng
            shops_dict[shop_id]["items"].append({
                "cart_id": cart_item.id,
                "product_id": product.id,
                "name": product.name,
                "variant": "Mặc định",
                "image": getattr(product, 'image_link', 'https://via.placeholder.com/80'),
                "original_price": original_price,
                "price": final_price, 
                "discount_percent": discount_percent,
                "quantity": cart_item.quantity,
                "stock": stock_count
            })

        # 4. Tính Tổng tiền Ship và Tổng Thanh Toán
        checkout_data = list(shops_dict.values())
        shipping_subtotal = len(checkout_data) * shipping_fee_per_shop
        total_payment = merchandise_subtotal + shipping_subtotal

        # 5. Trả về format JSON cực chuẩn cho trang Checkout của React
        return {
            "status": "success",
            "message": "Tính toán giỏ hàng thành công",
            "data": {
                "merchandise_subtotal": merchandise_subtotal,
                "shipping_subtotal": shipping_subtotal,
                "total_payment": total_payment,
                "checkout_data": checkout_data
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"API Error Checkout Preview: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi tính toán giỏ hàng")
@router_order.post("/checkout")
def create_order_endpoint(
    order_data: CreateOrder, 
    current_user = Depends(get_current_customer), 
    session: Session = Depends(get_session)
):
    """
    API Tạo đơn hàng (Checkout)
    Luồng này sẽ tự động tách giỏ hàng thành nhiều đơn (Sub-orders) nếu mua từ nhiều Shop khác nhau.
    """
    if not check_exist_info_customer(current_user):
        raise HTTPException(
            status_code=400, 
            detail={"code": "MISSING_INFO", "message": "Vui lòng cập nhật đầy đủ thông tin giao hàng."}
        )
 
    try:
        # Gọi xuống service để chạy thuật toán "Tách đơn theo Shop"
        result = create_checkout_orders(order_data=order_data, customer_id=current_user.id, session=session)
        return result
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"API Error Checkout: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi tạo đơn hàng")


@router_order.get('/customer/get-status/{status}')
def get_status_order_for_customer(
    status: str, 
    page: int = 1,  
    limit: int = 7, 
    session: Session = Depends(get_session), 
    current_customer: Customer = Depends(get_current_customer)
):
    """
    API Lấy danh sách đơn mua của Khách hàng theo trạng thái (Có phân trang)
    """
    try:
        offset = (page - 1) * limit
        results = get_customer_orders(
            status=status, 
            session=session, 
            current_id=current_customer.id,
            limit=limit,
            offset=offset 
        )
        return results
        
    except Exception as e:
        print(f"Lỗi truy vấn đơn hàng Customer: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi lấy danh sách đơn hàng.")


# =====================================================================
# 2. NHÓM API DÀNH CHO NGƯỜI BÁN (SELLER)
# =====================================================================

@router_order.get("/seller/dashboard-stats")
def get_seller_dashboard_stats_endpoint(
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller)
):
    """
    Lấy thống kê tổng quan cho Seller Dashboard:
      - pending_count              : Đơn chờ xác nhận  (PENDING)
      - accepted_count             : Đơn chờ lấy hàng  (ACCEPT)
      - cancellation_request_count : Yêu cầu hủy       (PROCESSING_CANCEL)
      - out_of_stock_count         : Sản phẩm hết hàng (stock == 0)
      - locked_products_count      : Sản phẩm bị khóa  (status == 'locked')
    """
    stats = get_seller_dashboard_stats(seller_id=current_seller.id, session=session)
    return {"status": "success", "data": stats}

@router_order.get("/seller/get-orders")
def get_orders_for_seller(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller)
):
    """
    API Lấy danh sách đơn hàng để hiển thị trên Dashboard của Seller
    Gom nhóm các sản phẩm chung 1 đơn thành 1 record duy nhất (X và N sản phẩm khác)
    """
    try:
        seller_id = current_seller.id 
        
        # BƯỚC 1: Xây dựng câu lệnh JOIN 4 bảng
        statement = (
            select(
                Order.id, 
                Order.status, 
                Order.total_price, 
                Order.created_at, 
                Order.payment_method,
                Customer.name.label("customer_name"), 
                Product.name.label("product_name"),   
                Product.image_link                    
            )
            .join(Customer, Order.customer_id == Customer.id)
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(Product.seller_id == seller_id) # Chỉ lấy đơn có chứa sản phẩm của Shop này
        )

        if status:
            valid_statuses = ["PENDING", "ACCEPT", "DELIVERING", "COMPLETED", "PROCESSING_CANCEL", "CANCELLED"]
            if status not in valid_statuses:
                raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ.")
            statement = statement.where(Order.status == status)

        # Sắp xếp mới nhất lên đầu và phân trang
        statement = statement.order_by(Order.id.desc()).offset(skip).limit(limit)

        raw_results = session.exec(statement).all()

        # BƯỚC 2: Gom nhóm dữ liệu theo Order ID để đếm số lượng mặt hàng
        formatted_orders = {}
        for row in raw_results:
            order_id = row.id
            if order_id not in formatted_orders:
                formatted_orders[order_id] = {
                    "id": order_id,
                    "customer": getattr(row, "customer_name", "Khách hàng ẩn"), 
                    "status": row.status,
                    "shippingMethod": row.payment_method,
                    "total": row.total_price, 
                    "date": row.created_at.strftime("%d/%m/%Y") if row.created_at else "",
                    "base_product_name": getattr(row, "product_name", ""), 
                    "productImage": row.image_link,
                    "items_count": 1 
                }
            else:
                formatted_orders[order_id]["items_count"] += 1

        # BƯỚC 3: Format lại tên sản phẩm hiển thị "X và N sản phẩm khác"
        final_data = []
        for order in formatted_orders.values():
            count = order["items_count"]
            base_name = order["base_product_name"]
            
            if count > 1:
                order["productName"] = f"{base_name} và {count - 1} sản phẩm khác"
            else:
                order["productName"] = base_name
                
            # Dọn dẹp key nháp
            order.pop("base_product_name", None)
            order.pop("items_count", None)
            
            final_data.append(order)

        return {
            "status": "success",
            "message": "Lấy danh sách đơn hàng thành công",
            "data": final_data
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi truy vấn seller get-orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")


@router_order.put("/seller/update-status/{order_id}")
def update_order_status_by_seller(
    order_id: int,
    request: StatusOrderbyCustomer, 
    session: Session = Depends(get_session),
    current_seller = Depends(get_current_seller)
):
    """
    API Cập nhật trạng thái đơn hàng dành cho Seller
    """
    try:
        # 1. Tìm đơn hàng
        order = session.get(Order, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng này.")

        # 2. Kiểm tra bảo mật: Đảm bảo Seller này có quyền sửa đơn hàng này
        # Kiểm tra xem trong OrderItem của đơn này có sản phẩm nào thuộc về current_seller không
        statement = (
            select(OrderItem)
            .join(Product, OrderItem.product_id == Product.id)
            .where(OrderItem.order_id == order_id)
            .where(Product.seller_id == current_seller.id)
        )
        seller_items = session.exec(statement).first()
        
        if not seller_items:
            raise HTTPException(
                status_code=403, 
                detail="Bạn không có quyền cập nhật trạng thái cho đơn hàng này."
            )

        # 3. Validate trạng thái
        valid_statuses = ["PENDING", "ACCEPT", "DELIVERING", "COMPLETED", "PROCESSING_CANCEL", "CANCELLED"]
        # Convert to upper case để đồng bộ chuẩn chữ hoa trong DB
        new_status = request.status.upper()
        
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ.")

        # 4. Lưu DB
        order.status = new_status
        session.add(order)
        
        # 5. Tạo thông báo cho customer về việc thay đổi trạng thái
        create_order_status_notification(session, order, new_status)
        
        session.commit()
        session.refresh(order)

        return {
            "status": "success",
            "message": "Cập nhật trạng thái đơn hàng thành công!",
            "data": {
                "order_id": order.id,
                "new_status": order.status
            }
        }

    except HTTPException:
        raise 
    except Exception as e:
        print(f"Lỗi khi cập nhật trạng thái đơn {order_id}: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi cập nhật đơn hàng.")

@router_order.patch('/customer/update-status/{order_id}')
def update_order_status_by_customer(
    order_id : int ,
    data : StatusOrderbyCustomer  ,
    customer : Customer = Depends(get_current_customer),
    session : Session = Depends(get_session)
) :
    try :
        result = update_status_logic(session=session,customer_id= customer.id ,status= data.status , order_id= order_id)
        return {
            'status' : 'sucess' ,
            'message' : 'Da update thanh cong' ,
            'data' : result
        }
    except HTTPException as http_e :
        raise http_e
    except Exception as e :
        print(f"Error: {e}") 
        raise HTTPException(status_code=500, detail="Lỗi hệ thống không xác định")