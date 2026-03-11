from sqlmodel import SQLModel , Field
from typing import Optional
from datetime import datetime
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
    id : int

# --- feedback ------
class CreateFeedback(SQLModel) :
    thread_id : str 
    rating : Optional[int] 
    comment : Optional[str] 
    history : list

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
    root_cause : str
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


class UpdateProfile (SQLModel) :
    name : str
    map_id : int
    number :str
    address_detail : str 

class CustomerUpdate(SQLModel):
    name: Optional[str] = None
    number: Optional[str] = None
    map_id: Optional[int] = None
    address_detail: Optional[str] = None
    note : Optional[str] = None