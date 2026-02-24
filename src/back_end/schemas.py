from sqlmodel import SQLModel , Field
from typing import Optional
from datetime import datetime
class ProductRead(SQLModel) :
    id : int 
    name : str = Field(index=True)
    price : float 
    stock : int
    description : str 
    image_link : str
    product_link : str
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

