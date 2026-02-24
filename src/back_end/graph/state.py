from typing import TypedDict, Optional, Annotated
import operator

class Attempt(TypedDict):
    context: str
    score: float
    keyword_used: str
    
class AgentState(TypedDict):
    question: str
    chat_history: list[str]
    

    user_id: Optional[int]
    thread_id: Optional[str]
    context: Annotated[list[str], operator.add] # Dùng Annotated để các Node cộng dồn context thay vì ghi đè
    question_reweite: Optional[str] 
    answer: Optional[str]
    retry_count: int = 0
    score: Optional[float]
    keyword: Optional[str]
    min_price: Optional[float]  
    max_price: Optional[float]
    
    # Lịch sử các lần thử (Cũng nên cộng dồn)
    attempts_history: Annotated[list[Attempt], operator.add]