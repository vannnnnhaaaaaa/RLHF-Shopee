
import sys
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.dirname(current_dir)
sys.path.append(src_dir)
from src.back_end.graph.workflow import app

if __name__ == "__main__" :
    query = 'hello'
    inputs = {
        'question' : query ,
        'chat_history' : []
    }
    print("Bot dang suy nghi")
    result= app.invoke(inputs)

    print("\n✅ Câu trả lời của Bot:")
    print(result['answer'])
    print(result['context'])