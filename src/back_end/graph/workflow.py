from langgraph.graph import StateGraph, END
from src.back_end.graph.state import AgentState
from src.back_end.graph.node import (
    classify_chat,
    retriever_node,
    rewrite_question,
    generate_node,
    chat_general_node,
    extract_keywords_node,
    grader_node,
    selector_node,
)

# --- CÁC NODE PHỤ TRỢ ---

def init_state_node(state: AgentState):
    """Khởi tạo state lần đầu tiên"""
    return {
        "retry_count": 0,
        "context": [],
        "attempts_history": []
    }

def increment_retry_node(state: AgentState):
    """Tăng biến đếm retry"""
    current_retry = state.get("retry_count", 0)
    return {"retry_count": current_retry + 1}

# --- CÁC HÀM ĐIỀU KIỆN (ROUTER LOGIC) ---

def route_start_logic(state):
    """
    Hàm điều hướng tổng hợp cho Init Node.
    Logic:
    1. Nếu có lịch sử chat -> Rewrite (viết lại câu hỏi).
    2. Nếu không có lịch sử -> Check Intent (Search hay Chat).
    """
    # 1. Check Memory
    history = state.get('chat_history', [])
    if history:
        return "rewrite"
    
    # 2. Check Intent (Nếu không có memory)
    intent = classify_chat(state)
    if intent == 'search':
        return 'search'
    else:
        return 'chat_general'

def check_intent_after_rewrite(state):
    """
    Sau khi Rewrite, kiểm tra lại xem nên làm gì.
    Thường thì rewrite xong là để search, nhưng check lại cho chắc.
    """
    intent = classify_chat(state)
    return 'search' if intent == 'search' else 'chat_general'

def check_retry_logic(state):
    history = state.get('attempts_history', [])
    last_score = history[-1].get('score', 0.0) if history else 0.0
    retry = state.get('retry_count', 0)

    if last_score >= 0.8 or retry >= 2:
        return 'selector'
    else:
        return "retry"

# --- XÂY DỰNG GRAPH ---

workflow = StateGraph(AgentState)

# 1. Add Nodes
workflow.add_node('init_node', init_state_node) 
workflow.add_node('increment_retry', increment_retry_node) 
workflow.add_node('grader', grader_node)
workflow.add_node('rewrite_query', rewrite_question)
workflow.add_node('generate', generate_node)
workflow.add_node('retriever', retriever_node)
workflow.add_node('chat_general', chat_general_node)
workflow.add_node('extract_keyword', extract_keywords_node)
workflow.add_node('selector', selector_node)

# 2. Entry Point
workflow.set_entry_point("init_node")

# 3. Edges & Conditional Edges

workflow.add_conditional_edges(
    'init_node',
    route_start_logic,
    {
        'rewrite': 'rewrite_query',      # Có lịch sử -> Rewrite
        'search': 'extract_keyword',     # Không lịch sử, muốn tìm kiếm -> Extract Keyword
        'chat_general': 'chat_general'   # Không lịch sử, chào hỏi -> Chat General
    }
)

workflow.add_conditional_edges(
    'rewrite_query',
    check_intent_after_rewrite,
    {
        'search': 'extract_keyword',
        'chat_general': 'chat_general'
    }
)

# --- LUỒNG TÌM KIẾM ---
workflow.add_edge('extract_keyword', 'retriever')
workflow.add_edge('retriever', 'grader')

# --- LUỒNG RETRY ---
workflow.add_conditional_edges(
    'grader',
    check_retry_logic,
    {
        'selector': 'selector',       # Đủ điều kiện -> Chọn kết quả
        'retry': 'increment_retry'    # Chưa đạt -> Tăng retry count
    }
)

# Retry xong thì quay lại Rewrite để sửa câu hỏi
workflow.add_edge('increment_retry', 'rewrite_query') 

# --- LUỒNG KẾT THÚC ---
workflow.add_edge('selector', 'generate')
workflow.add_edge('generate', END)
workflow.add_edge('chat_general', END)

app = workflow.compile()