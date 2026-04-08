from sqlmodel import Session, select
from fastapi import HTTPException, status
from src.backend.models import CartItem, Product

def add_item_to_cart(db: Session, customer_id: int, product_id: int, quantity: int):
    """
    Xử lý logic thêm sản phẩm vào giỏ hàng.
    - Kiểm tra tồn kho.
    - Cộng dồn số lượng nếu sản phẩm đã có trong giỏ.
    """
    # 1. Kiểm tra xem sản phẩm có tồn tại và đang bán không
    product = db.get(Product, product_id)
    if not product or product.status != 'active':
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Sản phẩm không tồn tại hoặc đã ngừng kinh doanh."
        )

    # 2. Kiểm tra số lượng yêu cầu có vượt quá tồn kho không
    if product.stock < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Kho không đủ. Chỉ còn {product.stock} sản phẩm."
        )

    # 3. Tìm xem sản phẩm này ĐÃ CÓ trong giỏ của user này chưa
    statement = select(CartItem).where(
        CartItem.customer_id == customer_id, 
        CartItem.product_id == product_id
    )
    existing_item = db.exec(statement).first()

    if existing_item:
        # Nếu đã có -> CỘNG DỒN SỐ LƯỢNG
        new_quantity = existing_item.quantity + quantity
        
        # Kiểm tra lại tồn kho một lần nữa cho tổng số lượng mới
        if product.stock < new_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Kho không đủ. Bạn đã có {existing_item.quantity} cái trong giỏ, không thể thêm nữa."
            )
            
        existing_item.quantity = new_quantity
        db.add(existing_item)
    else:
        # Nếu chưa có -> TẠO DÒNG MỚI
        new_item = CartItem(
            customer_id=customer_id, 
            product_id=product_id, 
            quantity=quantity
        )
        db.add(new_item)

    # 4. Lưu vào Database
    try:
        db.commit()
        return {"status": "success", "message": "Đã thêm vào giỏ hàng"}
    except Exception as e:
        db.rollback()
        print(f"Lỗi DB khi thêm vào giỏ hàng: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi lưu giỏ hàng.")



def get_cart_items(db: Session, customer_id: int):
    """
    Lấy danh sách giỏ hàng và gom nhóm theo Shop để Frontend dễ render.
    """
    # 1. Lệnh JOIN: Lấy Giỏ hàng CỦA KHÁCH ĐÓ + Thông tin Sản phẩm TƯƠNG ỨNG
    statement = (
        select(CartItem, Product)
        .join(Product, CartItem.product_id == Product.id)
        .where(CartItem.customer_id == customer_id)
    )
    
    results = db.exec(statement).all()
    
    # 2. Xử lý gom nhóm bằng Python Dictionary
    shops_dict = {}
    
    for cart_item, product in results:
        # Lấy ID của người bán (Chủ shop)
       
        shop_id = getattr(product, 'seller_id', 1) 
        
        # Nếu shop này chưa có trong từ điển, tạo mới một "khung" cho shop đó
        if shop_id not in shops_dict:
            shops_dict[shop_id] = {
                "shop_id": shop_id,
                "shop_name": f"Shop của Người bán {shop_id}", # Sau này JOIN thêm bảng User/Seller để lấy tên thật
                "shop_badge": "Yêu thích", # Mock data
                "items": []
            }
            
        # 3. Đưa sản phẩm vào mảng 'items' của đúng Shop đó
        shops_dict[shop_id]["items"].append({
            "cart_id": cart_item.id,
            "product_id": product.id,
            "name": product.name,
            "variant": "Mặc định", # Nếu bạn có bảng Variant thì lấy, không thì để Mặc định
            "image": getattr(product, 'image_link', 'https://via.placeholder.com/80'),
            "price": product.price,
            "quantity": cart_item.quantity,
            "discount_percent": getattr(product, 'discount_percent', 0),
            "stock": product.stock
        })
        
    # Chuyển từ điển (Dictionary) thành mảng (List) để trả về JSON chuẩn
    return list(shops_dict.values())