from sqlmodel import SQLModel , Field  ,Column , Relationship
from typing import Optional , List 
from pgvector.sqlalchemy import Vector
from datetime import datetime




class ChatMessage (SQLModel , table= True) :
    id: Optional[int] = Field(primary_key=True , default=None)
    thread_id: str = Field(index=True)
    role: str
    content: str
    created_at: datetime = Field(default_factory=datetime.now)
    
class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thread_id: str = Field(index=True) 
    rating: Optional[int] 
    comment: Optional[str] = None  
    created_at: datetime = Field(default_factory=datetime.now)

    ai_score : int 
    agent_sentiment :Optional [str] = None 
    root_cause : Optional[str] = None

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
class Map(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)   
    city: str 
    district: str 
    latitude: float 
    longitude: float

class Shipping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)   
    base_fee: float = Field(default=10000)

class Seller(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)  
    name: str 
    cccd_front: str 
    cccd_back: str
    cccd_number: Optional[str] = None 
    status: str = Field(default='pending')
    
    # Quan hệ
    products: List["Product"] = Relationship(back_populates='seller')
    vouchers: List["Voucher"] = Relationship(back_populates="seller")

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True) 
    user_name: str = Field(index=True, unique=True)
    hased_password : str 
    name: str 
    map_id: Optional[int] = Field(foreign_key='map.id')  
    number: Optional[str] = None
    address_detail: Optional[str] = None
    
    # Quan hệ
    bills: List["Bill"] = Relationship(back_populates="customer")
    cart_items: Optional[List["CartItem"]] = Relationship(back_populates="customer")
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
    product_link: str
    category: Optional[str] = None 
    embedding: Optional[List[float]] = Field(sa_column=Column(Vector(384)))
    weight: float 
    
    status: str = Field(default="pending_inbound")
    declared_stock: int = Field(default=0)
    actual_stock: int = Field(default=0)
    
    # Điểm do AI tự động tính để xếp hạng
    ai_ranking_score: float = Field(default=0.0, index=True)
    
    seller_id: int = Field(foreign_key="seller.id")
    seller: Seller = Relationship(back_populates='products')
    
    reviews: List["Review"] = Relationship(back_populates="product")

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
    valid_until: datetime 
    
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
    created_at: datetime = Field(default_factory=datetime.now)
    
    product_id: int = Field(foreign_key="product.id")
    customer_id: int = Field(foreign_key="customer.id")
    
    product: Product = Relationship(back_populates="reviews")

class CartItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id") 
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)

    customer: Customer = Relationship(back_populates="cart_items")
    product: Product = Relationship()

class Bill(SQLModel, table=True):
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
    customer: Customer = Relationship(back_populates="bills")
    
    # LƯU MÃ VOUCHER ĐÃ ÁP DỤNG
    shopee_voucher_id: Optional[int] = Field(default=None, foreign_key="voucher.id")
    seller_voucher_id: Optional[int] = Field(default=None, foreign_key="voucher.id")
    
    detail_bill: List["BillDetail"] = Relationship(back_populates="bill")

class BillDetail(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)    
    quantity: int 
    price_at_purchase: float

    bill_id: int = Field(foreign_key='bill.id')
    bill: Bill = Relationship(back_populates="detail_bill")
    
    product_id: int = Field(foreign_key="product.id")
    product: Product = Relationship()