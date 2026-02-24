from src.back_end.graph.workflow import app
from src.back_end.Router_api.task import get_detail_feedback
if __name__ == "__main__" :
    thread_id = 8
    message = get_detail_feedback(thread_id)
    print(message)