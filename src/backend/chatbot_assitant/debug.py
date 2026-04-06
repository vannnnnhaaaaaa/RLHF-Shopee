from langchain_core.messages import HumanMessage, AIMessage

from graph.legal_agent import agent_manager
from graph.graph import _build_llm_for_router_and_extract

print('Bắt đầu khởi tạo hệ thống test...')

# --- LỖI NẰM Ở ĐÂY: BẠN THIẾU BƯỚC KHỞI TẠO NODE ---
# Bạn phải gọi hàm cha (Factory) và truyền agent_manager vào 
# để nó trả về cái hàm con (Node), sau đó gán vào biến test_node.
test_node = _build_llm_for_router_and_extract(agent_manager)


# --- TẠO STATE GIẢ LẬP ---
# Trong LangGraph, State thực chất hoạt động như một Dictionary.
# Nên khi test, chúng ta chỉ cần tạo một biến dict bình thường là xong, 
# không cần gọi class AgentState ra làm gì cho phức tạp.
fake_state_1 = {
    "messages" : [
        HumanMessage(content="Shop ơi có áo thun polo không?"),
    ]
}

print('\nBắt đầu chạy Node...')
# --- TRUYỀN STATE VÀO NODE ĐỂ CHẠY ---
kq_1 = test_node(fake_state_1)

print('\n=== KẾT QUẢ TRẢ VỀ TỪ NODE ===')
print(kq_1)