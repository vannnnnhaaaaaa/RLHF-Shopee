from sqlmodel import SQLModel , Field
from typing import Optional, List , Literal
from pydantic import BaseModel
from datetime import datetime
from enum import Enum
class ProductRead(SQLModel) :
    id : int 
    name : str = Field(index=True)
    price : float 
    sold_count : int
    description : str 
    image_link : str
    product_link : str
    discount_percent : Optional[int] 
    shop_badge : str 
    tag : str
    category : Optional[str] = None 

#-- --- -- ChatMessage -- --- --

class ChatMessage(SQLModel) :
    id : int
    thread_id : str 
    content : str 
    role : str 
    created_at : datetime


class ChatRequest(SQLModel):
    question: str
    thread_id: str
    history : Optional[list[str] ] = []

class ChatResponse(SQLModel):
    answer: str


# --- feedback ------
class CreateFeedback(SQLModel) :
    thread_id : str 
    rating : Optional[int] 
    comment : Optional[str] 
    history : list
    root_cause_by_human: Optional[list] = []


class FeedbackResponse (SQLModel) :
    id: int
    thread_id: str
    rating : Optional[int]  
    comment : Optional[str]   
    created_at : datetime
    

# --- User ---------

class UserCreate  (SQLModel ) :
    user_name : str = Field(index=True , unique=True)
    password : str = Field(min_length=1, max_length=72)

class UserRead(SQLModel):
    id: int
    user_name: str
    auth: str

# -- --- SCHEMA FOR TASK --- -- #

class TaskBase(SQLModel):
    title: str
    description: str

class TaskCreateByAI(TaskBase):
    related_feedback_id: int

class TaskApprove (SQLModel) :
    deadline : int

class TaskCreate (SQLModel) :
    title : str 
    description : str
    deadline : datetime
    feedback_id : int 

    admin_id :Optional[int] 
    status : Optional[str]    
    member_id : Optional[int]    


class TaskRead(SQLModel) :
    id : int 
    title : str
    description : str
    status : str
    deadline :Optional[datetime] 
    

class TaskReadDetail (TaskRead) :
    feedback_at : datetime
    deadline : Optional[datetime] = None
    completed_at : Optional[datetime]
    delay_info : Optional[str] = None
    messages : list[ChatMessage]
    agent_sentiment : str 
    root_cause_by_ai : Optional[str] = None
    root_cause_by_human : Optional[str] = None
    comment : Optional[str] 
    rating : int


class TaskResultBasic(SQLModel) :
    following : str 
    grounded : str 
    useful : str 
    harmful : str 
    solution : str

class TaskResultUpdate (TaskResultBasic) :
    total_time : int 
    active_time : int 
    idle_time : int 

class TaskResultResponse (TaskResultUpdate) :
    id : int
    status : str

class CreateFinalResult(SQLModel) :
    following : str 
    grounded : str 
    useful : str 
    harmful : str 
    solution : str

class SellerCreateRequest(SQLModel):
    shop_name: str
    phone_number: str
    email: str
    city: str
    detailed_address: str
    cccd_number: str
    bank_name: str
    bank_account: str
    bank_holder: str


class CustomerAuthRequest(SQLModel):
    user_name: str
    password: str


# --- DISTRIBUTED TASKS TRACKING ---

class WorkerTaskStatus(SQLModel):
    """Thông tin worker cho một task"""
    user_id: int
    username: str
    status: str  # "pending", "activate", "completed"
    time_taken_seconds: Optional[int] = None  # Chỉ có khi status="completed"
    total_time: int = 0
    active_time: int = 0


class DistributedTaskResponse(SQLModel):
    """Task đã được phân công với danh sách workers"""
    id: int
    title: str
    description: Optional[str] = None
    status: str
    deadline: Optional[datetime] = None
    created_at: Optional[datetime] = None
    workers: List[WorkerTaskStatus]  # Danh sách 3 user


class ProductCreateSchema(SQLModel):
    name: str
    category: str
    description: str
    price: float
    stock: int
    has_variants: bool

class ProductPublic(SQLModel):
    id: int
    name: str
    category: str
    price: float
    stock: int
    image_link: Optional[str] = None
    status: Optional[str] = None
    shop_badge : Optional[str]
    tag : Optional[str]
    # Bạn có thể thêm các trường bạn MUỐN hiển thị ở Frontend
    description: Optional[str] = None
    sold_count: Optional[int] = 0
    discount_percent: Optional[int] = 0

    # Cấu hình để Pydantic có thể đọc thẳng từ đối tượng SQLModel/SQLAlchemy
    class Config:
        from_attributes = True 

# 2. Khuôn mẫu cho toàn bộ Response trả về (Có status và data)
class ProductListResponse(SQLModel):
    status: str
    data: list[ProductPublic]

class AddToCartRequest(SQLModel):
    product_id: int
    quantity: int = 1 



class CustomerUpdate(SQLModel):
    name: Optional[str] = None
    number: Optional[str] = None
    map_id: Optional[int] = None
    address_detail: Optional[str] = None
    note : Optional[str] = None


class VoucherCreate (SQLModel) :
    code : str 
    discount_type : str
    discount_value : float
    creator_type : str 

    max_discount : float 
    min_spend : Optional[float] 

    quantity : int 
    valid_unit : datetime
    product_id : Optional[int] = None


#-- --- Order --- -- 
class CreateOrderItem(BaseModel):
    product_id: int
    quantity: int
    price_at_purchase: float

class CreateOrder(BaseModel):
    total_price: float
    total_shipping: float
    status: str = "PENDING"
    payment_method: str = "COD"
    payment_status: str = "PENDING"
    discount_product: float = 0.0
    discount_shipping: float = 0.0
    shopee_voucher_id: Optional[int] = None
    seller_voucher_id: Optional[int] = None
    
    # Danh sách các sản phẩm trong đơn hàng
    details: list[CreateOrderItem] 


# --- SCHEMAS CHO ĐẦU RA (RESPONSE) ---
class ResponseOrderItem(SQLModel):
    id: int
    product_id: int
    quantity: int
    price_at_purchase: float
    
    # Thêm thông tin sản phẩm cơ bản
    product_name: str
    product_category: Optional[str] = None
    product_image: str  # ảnh chính duy nhất
    
    class Config:
        from_attributes = True

class ResponseOrder(SQLModel):
    id: int
    customer_id: int
    total_price: float
    total_shipping: float
    status: str
    payment_method: str
    payment_status: str
    discount_product: float
    discount_shipping: float
    shopee_voucher_id: Optional[int]
    seller_voucher_id: Optional[int]
    created_at: datetime
    
    # Trả về kèm danh sách chi tiết đơn hàng
    items: list[ResponseOrderItem] = []


class OrderStatus (str , Enum ) :
    PENDING = "PENDING"
    ACCEPT = "ACCEPT"
    DELIVERING = "DELIVERING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    PROCESSING_CANCEL = "PROCESSING_CANCEL"

class StatusOrderbyCustomer (BaseModel) :
    status : OrderStatus


#-- --- Notification --- --
class ResponseNotification(SQLModel):
    id: int
    user_id: int
    title: str
    body: str
    image_url: Optional[str]
    order_id: Optional[int]
    is_read: bool
    created_at: datetime

class CheckoutPreviewRequest(BaseModel):
    cart_ids: List[int]


# --- SCHEMA CHO SELLER DASHBOARD STATS ---
class SellerDashboardStats(SQLModel):
    pending_count: int          # PENDING
    accepted_count: int         # ACCEPT
    cancellation_request_count: int   # PROCESSING_CANCEL
    out_of_stock_count: int     # stock == 0
    locked_products_count: int  # status == "locked"

    class Config:
        from_attributes = True



# --- SCHEMAS CHO SELLER VOUCHER ---
class SellerVoucherCreate(BaseModel):
    code: str
    
    # [FIX TẠI ĐÂY]: Thay thế hoàn toàn regex bằng Literal
    discount_type: Literal["percent", "fixed"] 
    
    discount_value: float
    min_spend: float = 0
    max_discount: Optional[float] = None
    valid_from: datetime
    valid_until: datetime
    quantity: int
    product_id: Optional[int] = None

class SellerVoucherResponse(SQLModel):
    id: int
    code: str
    discount_type: str
    discount_value: float
    min_order_value: float
    max_discount_amount: Optional[float]
    start_date: datetime
    end_date: datetime
    usage_limit: int
    used_count: int
    is_active: bool

    class Config:
        from_attributes = True


# =============================================================================
# SCHEMAS CHO ADMIN VOUCHER (Shopee Voucher & Product Voucher)
# =============================================================================

class ShopeeVoucherCreate(BaseModel):
    """Request body cho API tạo Shopee Voucher (Toàn sàn)."""
    code: str
    discount_type: str          # 'fixed' | 'percent'
    discount_value: float
    max_discount: Optional[float] = None
    min_spend: float = 0
    quantity: int
    valid_until: datetime


class ProductVoucherCreate(BaseModel):
    """Request body cho API tạo Product Voucher (Cho 1 sản phẩm cụ thể)."""
    code: str
    product_id: int             # Bắt buộc — sản phẩm được áp dụng
    discount_type: str          # 'fixed' | 'percent'
    discount_value: float
    max_discount: Optional[float] = None
    min_spend: float = 0
    quantity: int
    valid_until: datetime


class VoucherResponse(BaseModel):
    id: int
    code: str
    creator_type: str
    voucher_type: str
    apply_to: str
    discount_type: str
    discount_value: float
    max_discount: Optional[float]
    min_spend: float
    quantity: int
    used_count: int
    
    # [FIX TẠI ĐÂY]: Bọc Optional và gán giá trị mặc định để "cứu" các Voucher cũ
    valid_from: Optional[datetime] = None 
    valid_until: datetime
    is_active: Optional[bool] = True      
    
    seller_id: Optional[int]
    product_id: Optional[int]

    class Config:
        from_attributes = True