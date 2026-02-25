from sqlmodel import SQLModel , Field  ,Column , Relationship
from typing import Optional , List 
from pgvector.sqlalchemy import Vector
from datetime import datetime
class Product (SQLModel , table = True) :
    id : Optional[int] = Field (default=None , primary_key= True)
    name : str = Field(index=True)
    price : float 
    stock : int
    description : str 
    image_link : str
    product_link : str
    category : Optional[str] = None 
    embedding: Optional[List[float]] = Field(sa_column=Column(Vector(384)))

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