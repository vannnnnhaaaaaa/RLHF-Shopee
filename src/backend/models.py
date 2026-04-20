from sqlmodel import SQLModel , Field  ,Column , Relationship
from typing import Optional , List
from sqlalchemy.dialects.postgresql import ARRAY, INTEGER, JSONB
from pgvector.sqlalchemy import Vector
from datetime import datetime, timezone


class ChatMessage (SQLModel , table= True) :
    id: Optional[int] = Field(primary_key=True , default=None)
    thread_id: str = Field(index=True)
    role: str
    content: str
    suggested_product_ids: Optional[List[int]] = Field(default=None, sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=datetime.now)
    
class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thread_id: str = Field(index=True) 
    rating: Optional[int] 
    comment: Optional[str] = None  
    created_at: datetime = Field(default_factory=datetime.now)

    ai_score : int 
    agent_sentiment :Optional [str] = None 
    root_cause_by_ai : Optional[str] = None
    root_cause_by_human : Optional[str] = None
    process_status: str = Field(default="pending")
    related_tasks: List["Task"] = Relationship(back_populates="feedback_info")

# -------------Phần quản lý sửa chữa , fine-tune ----------------
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_name: str = Field(index=True, unique=True)
    hashed_password: str
    auth: str = Field(default='member')
    
    created_tasks: List["Task"] = Relationship(
        back_populates="admin_user",
        sa_relationship_kwargs={"foreign_keys": "Task.admin_id"} 
    )
    trust_score : int = Field(default=100)
    submitted_results: List["TaskResult"] = Relationship(back_populates="member_user")

class Task(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True, default=None)
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(default="")
    status: str = Field(default="pending") 
    deadline: Optional[datetime] = None
    started_at: Optional[datetime] = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

    related_feedback_id: int = Field(foreign_key="feedback.id")
    feedback_info: Optional["Feedback"] = Relationship(back_populates='related_tasks')
    
    admin_id: Optional[int] = Field(foreign_key="user.id") 
    admin_user: "User" = Relationship(
        back_populates="created_tasks",
        sa_relationship_kwargs={"foreign_keys": "Task.admin_id"}
    )

    
    result_tasks: List["TaskResult"] = Relationship(back_populates='task')

class TaskResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    following: Optional[str]  
    grounded: Optional[str]   
    useful: Optional[str]   
    harmful: Optional[str]   
    solution: Optional[str]  = Field(default="")
    status: str = Field(default="activate")

    task_id: int = Field(foreign_key="task.id")
    task: Task = Relationship(back_populates='result_tasks')

    member_id: int = Field(foreign_key="user.id")
    member_user: User = Relationship(back_populates='submitted_results')

    total_time: int = Field(default=0)
    active_time: int = Field(default=0)
    idle_time: int = Field(default=0)
    
    created_at: datetime = Field(default_factory=datetime.now)

class FinalResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="task.id")
    admin_id: int = Field(foreign_key="user.id")
 
    final_following: str
    final_grounded: str
    final_useful: str
    final_harmful : str
    final_solution: str  

    created_at: datetime = Field(default_factory=datetime.now)
    
#-- --- Phần tọa độ vs sản phẩm -- ---- 
class Map (SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)   
    name: str 
    type : str
    parent_id : Optional[int]
    latitude: Optional[float] 
    longitude: Optional[float] 
  

    
class Shipping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)   
    base_fee: float = Field(default=10000)

class Seller(SQLModel, table=True):
    # Khóa chính và Khóa ngoại
    id: Optional[int] = Field(default=None, primary_key=True)  
    customer_id: Optional[int] = Field(foreign_key='customer.id')
    
    # 1. Thông tin gian hàng
    shop_name: str = Field(index=True) # Đổi name thành shop_name cho rõ nghĩa
    phone_number: str
    email: str
    # 2. Địa chỉ kho lấy hàng
    city: str
    detailed_address: str
    # 3. Thông tin định danh (CCCD)
    cccd_number: str 
    cccd_front: Optional[str] = None # Cho phép None nếu bước đăng ký đầu tiên chưa bắt upload ảnh
    cccd_back: Optional[str] = None 
    # 4. Thông tin tài chính (Nhận tiền)
    bank_name: str
    bank_account: str
    bank_holder: str
    # 5. Trạng thái và Thời gian
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    products: List["Product"] = Relationship(back_populates='seller')
    vouchers: List["Voucher"] = Relationship(back_populates="seller")

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True) 
    user_name: str = Field(index=True, unique=True)
    hashed_password : str 
    name: str 
    map_id: Optional[int] = Field(foreign_key='map.id')  
    number: Optional[str] = None
    address_detail: Optional[str] = None
    note:  Optional[str]
    # Quan hệ
    orders: List["Order"] = Relationship(back_populates="customer")
    cart_items: Optional[List["CartItem"]] = Relationship(back_populates="customer")
    reviews: List["Review"] = Relationship(back_populates="customer")


class CustomerFavorite(SQLModel, table=True):
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    product_id: int = Field(foreign_key="product.id", primary_key=True)
# ==========================================
# NHÓM 2: SẢN PHẨM & VOUCHER (Phụ thuộc Nhóm 1)
# ==========================================
class Warehouse(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str 
    map_id: int = Field(foreign_key="map.id")

class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    price: float 
    sold_count: int = Field(default=0)
    description: str 
    image_link: str
    video_link: str
    has_variants: bool
    stock: int = Field(default=0)
    category: Optional[str] = None 
    embedding: Optional[List[float]] = Field(sa_column=Column(Vector(384)))
    discount_percent: Optional[int]  
    shop_badge: Optional[str] 
    tag: Optional[str] 
    weight: float 
    length: float 
    width: float
    height: float
    create_at: datetime = Field(default_factory=datetime.now)
    status: str = Field(default="pending_inbound")
    view_count: int = Field(default=0)
    # [ĐÃ SỬA]: Thêm cascade xóa mồ côi (delete-orphan) cho SKUs
    skus: List["Product_Variants"] = Relationship(
        back_populates="product",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    ai_ranking_score: float = Field(default=0.0, index=True)
    
    seller_id: int = Field(foreign_key="seller.id")
    seller: "Seller" = Relationship(back_populates='products')
    
    reviews: List["Review"] = Relationship(back_populates="product")
    images: List["Product_image"] = Relationship(
        back_populates="product", 
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class Product_Variants(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key='product.id')
    tier_1_name: Optional[str]
    tier_1_value: Optional[str]
    tier_2_name: Optional[str]
    tier_2_value: Optional[str]
    price: float
    stock: int
    
    # [ĐÃ SỬA]: Phải có Relationship và trỏ ngược lại 'skus' bên bảng Product
    product: Optional[Product] = Relationship(back_populates="skus")


class Product_image(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id", ondelete="CASCADE")
    image_url: str
    is_primary: bool = Field(default=False)
    display_order: int = Field(default=0)
    # --- Mối quan hệ trỏ ngược lại Product ---
    product: Optional[Product] = Relationship(back_populates="images")  
class Voucher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)

    creator_type: str = Field(default="shopee")
    voucher_type: str = Field(default="discount")
    apply_to: str = Field(default="shop")

    discount_type: str = Field(default="fixed")
    discount_value: float
    max_discount: Optional[float] = Field(default=None)
    min_spend: float = Field(default=0)

    quantity: int
    used_count: int = Field(default=0)
    valid_from : datetime
    valid_until: datetime
    is_active: bool = Field(default=True)
    seller_id: Optional[int] = Field(default=None, foreign_key="seller.id")
    seller: Optional[Seller] = Relationship(back_populates="vouchers")

    product_id: Optional[int] = Field(default=None, foreign_key="product.id")



# ==========================================
# NHÓM 3: GIAO DỊCH, GIỎ HÀNG & ĐÁNH GIÁ (Phụ thuộc Nhóm 2)
# ==========================================
class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    rating: int = Field(ge=1, le=5)
    sentiment_score: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    product_id: int = Field(foreign_key="product.id")
    order_id: int = Field(foreign_key="orders.id")
    customer_id: int = Field(foreign_key="customer.id")

    product: Product = Relationship(back_populates="reviews")
    order: "Order" = Relationship(back_populates="reviews")
    customer: "Customer" = Relationship(back_populates="reviews")

class CartItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id") 
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)

    customer: Customer = Relationship(back_populates="cart_items")
    product: Product = Relationship()

class Order(SQLModel, table=True):
    __tablename__ = "orders"  # Use "orders" as table name since "order" is reserved
    id: Optional[int] = Field(default=None, primary_key=True)    
    total_price: float
    total_shipping: float
    status: str 
    created_at: datetime = Field(default_factory=datetime.now)
    payment_method: str = Field(default="COD") 
    payment_status: str = Field(default="pending")
    # LƯU TIỀN GIẢM GIÁ
    discount_product: float = Field(default=0)
    discount_shipping: float = Field(default=0)
    
    customer_id: int = Field(foreign_key='customer.id') 
    customer: Customer = Relationship(back_populates="orders")
    
    # LƯU MÃ VOUCHER ĐÃ ÁP DỤNG
    shopee_voucher_id: Optional[int] = Field(default=None, foreign_key="voucher.id")
    # Lưu nhiều seller voucher dưới dạng mảng int4[] trong PostgreSQL
    seller_voucher_ids: Optional[List[int]] = Field(
        default=None,
        sa_column=Column(ARRAY(INTEGER), nullable=True)
    )
    
    items: List["OrderItem"] = Relationship(back_populates="order")
    reviews: List["Review"] = Relationship(back_populates="order")

class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"  # Use "order_items" as table name
    id: Optional[int] = Field(default=None, primary_key=True)    
    quantity: int 
    price_at_purchase: float

    order_id: int = Field(foreign_key='orders.id')  # Reference the "orders" table
    order: Order = Relationship(back_populates="items")
    
    product_id: int = Field(foreign_key="product.id")
    product: Product = Relationship()
class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="customer.id", index=True) 
    
    # 1. PHÂN LOẠI THÔNG BÁO (VD: 'ORDER', 'PROMO', 'SYSTEM')
    type: str = Field(default="ORDER", index=True) 
    
    title: str
    body: str
    image_url: Optional[str] = None
    
    # Điểm đến 1: Đơn hàng hoặc Sản phẩm
    order_id: Optional[int] = None
    product_id: Optional[int] = Field(default=None, foreign_key="product.id") 
    
    # Điểm đến 2: Đường dẫn tự do (Dành cho Marketing)
    action_url: Optional[str] = None 
    
    # Trạng thái người dùng
    is_read: bool = Field(default=False)
    is_deleted: bool = Field(default=False) # 3. XÓA MỀM
    
    created_at: datetime = Field(default_factory=datetime.utcnow)