from sqlmodel import Session , select , text

from langchain_core.prompts import  ChatPromptTemplate , MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser , JsonOutputParser
import json
from langchain_core.output_parsers import JsonOutputParser
import re
from langchain_core.output_parsers import StrOutputParser

from src.backend.models import Product
from src.backend.connect_database import engine
from src.backend.services.ai_engine import get_model_embedding , get_llm





# hàm lấy ra đc keyword của sản phẩm
def extract_keywords_node(state):
    print("---- 🧠 EXTRACTING KEYWORDS ---")
    input_text = state.get('question_rewrite') or state['question']
    
    # SỬA LỖI: Dùng {{ và }} cho các ví dụ JSON để LangChain không nhầm là biến
    system_prompt = """
    BẠN LÀ MỘT MÁY TRÍCH XUẤT DỮ LIỆU (DATA EXTRACTOR). NHIỆM VỤ CỦA BẠN LÀ CHUYỂN ĐỔI CÂU HỎI NGƯỜI DÙNG THÀNH ĐỊNH DẠNG JSON ĐỂ TRUY VẤN DATABASE.

    ### QUY TẮC TUYỆT ĐỐI:
    NHIỆM VỤ:
    - Tìm danh từ chính chỉ sản phẩm trong câu.
    - Nếu khách viết tắt keyword thì hãy viết rõ ra lại (vd: ip12prm -> Iphone 12 promax, ss -> samsung và những từ viết tắt khác ..)
    - TUYỆT ĐỐI KHÔNG trả lời câu hỏi.
    - TUYỆT ĐỐI KHÔNG đưa ra gợi ý hay danh sách.

    1. CHỈ TRẢ VỀ JSON THUẦN. KHÔNG CÓ LỜI DẪN, KHÔNG GIẢI THÍCH, KHÔNG DÙNG DẤU NHÁY ```json.
    2. NẾU KHÔNG CÓ THÔNG TIN GIÁ, HÃY ĐỂ LÀ null.
    3. CHUYỂN ĐỔI NGỮ CẢNH (INTENT MAPPING): 
       - Nếu khách nói chung chung như "đồ tết", "mặc tết", hãy ưu tiên trích xuất keyword phổ biến: "áo dài tết", "váy tết", "quần áo tết".
       - Nếu khách nói từ khóa quá dài, hãy rút gọn lại thành danh từ chính (VD: "kiếm cho tôi cái tai nghe hoco chính hãng màu đen" -> "tai nghe hoco").

    ### CÁCH XỬ LÝ GIÁ TIỀN:
    - "dưới 500k" -> max_price: 500000
    - "trên 1 triệu" -> min_price: 1000000
    - "tầm 200k" -> min_price: 180000, max_price: 220000 (Dao động +/- 10%)

    ### VÍ DỤ:
    Input: "giới thiệu tôi 1 ít đồ mặc tết"
    Output: {{"keyword": "áo dài tết", "min_price": null, "max_price": null}}

    Input: "tìm tai nghe bluetooth hoco dưới 300k"
    Output: {{"keyword": "tai nghe bluetooth hoco", "min_price": null, "max_price": 300000}}

    Input: "có cái váy đỏ nào tầm 200k không"
    Output: {{"keyword": "váy đỏ", "min_price": 180000, "max_price": 220000}}
    Hãy tuần theo ví dụ vào không tạo ra các từ dài dòng như :gợi ý cho tôi 1 ít đồ ăn vặt ngày tết 
    """
    
    llm = get_llm()
    parser = JsonOutputParser()
    
    prompt = ChatPromptTemplate.from_messages([
        ('system', system_prompt),
        ('human', "{input}") # Chỉ có {input} là biến thật
    ])
    
    chain = prompt | llm | parser
    
    try:
        data = chain.invoke({'input': input_text})
    except Exception as e:
        print(f"⚠️ Lỗi Parse JSON: {e}")
        data = {"keyword": input_text, "min_price": None, "max_price": None}

    print(f"   Extracted: {data.get('keyword')} | Price: {data.get('min_price')}-{data.get('max_price')}")
    
    return {
        'keyword': data.get('keyword'),
        "min_price": data.get('min_price'),
        "max_price": data.get('max_price')
    }

# hàm lấy sản phẩm theo keyword và theo sentimac
def retriever_node(state, limit=5):
    print("---- 🔍 RETRIEVER NODE (OPTIMIZED) ---")
    model_embedding = get_model_embedding()
    seen_ids = set()
    results = []
    
  
    search_query = state.get('keyword') 
    
 
    if not search_query:
        search_query = state.get('question_rewrite') or state.get('question')
        
    print(f"   🎯 Search Query dùng để tìm kiếm: '{search_query}'")
    

    vectors_query = model_embedding.encode(search_query).tolist()
 
    min_p = state.get('min_price')
    max_p = state.get('max_price')

    with Session(engine) as session:
        # --- GIAI ĐOẠN 1: TÌM KIẾM CHÍNH XÁC (TEXT MATCH) ---
        # Ưu tiên tìm những sản phẩm có tên chứa từ khóa
        try:
            # Xây dựng câu query cơ bản
            statement = select(Product)
            
            # Áp dụng bộ lọc giá (Hard Filter)
            if min_p is not None:
                statement = statement.where(Product.price >= min_p)
            if max_p is not None:
                statement = statement.where(Product.price <= max_p)
            
            # Thêm điều kiện tìm kiếm văn bản (ILIKE)
            # Lưu ý: Dùng unaccent để tìm không dấu (VD: 'ao dai' tìm ra 'áo dài')
            statement = statement.where(text("unaccent(name) ILIKE unaccent(:query)"))
            
            # Thực thi
            keyword_results = session.exec(statement.params(query=f"%{search_query}%").limit(limit)).all()
            
            for p in keyword_results:
                if p.id not in seen_ids:
                    results.append(p)
                    seen_ids.add(p.id)
            
            print(f"   ✅ Tìm thấy theo tên (Keyword): {len(results)} sản phẩm")
            
        except Exception as e:
            print(f"   ⚠️ Lỗi SQL Text Search: {e}")

     
        if len(results) < limit:
            remaining = limit - len(results)
            print(f"   🔄 Đang tìm thêm {remaining} sản phẩm bằng Vector...")
            
            # Query Vector cũng phải áp dụng bộ lọc giá!
            statement_vec = select(Product)
            
            if min_p is not None:
                statement_vec = statement_vec.where(Product.price >= min_p)
            if max_p is not None:
                statement_vec = statement_vec.where(Product.price <= max_p)
            
            # Sắp xếp theo độ tương đồng Vector
            statement_vec = statement_vec.order_by(Product.embedding.cosine_distance(vectors_query))
            
            # Lấy nhiều hơn một chút để lọc trùng
            vec_results = session.exec(statement_vec.limit(remaining * 2)).all()
            
            count_added = 0
            for p in vec_results:
                if p.id not in seen_ids:
                    results.append(p)
                    seen_ids.add(p.id)
                    count_added += 1
                    if count_added >= remaining:
                        break
            print(f"   ✅ Tìm thêm được: {count_added} sản phẩm bằng Vector")

    context_str = [
        f"ID: {p.id} | Tên: {p.name} | Giá: {p.price:,.0f} vnđ | Mô tả: {p.description}" 
        for p in results
    ]
    
    return {'context': context_str}

# hàm trả lời người dùng theo context đã lấy trước đó để trả lời người dùng
def generate_node(state) :
    llm = get_llm()
    context_str = "\n\n".join(state['context'])
    system_prompt = """
        Bạn là nhân viên tư vấn bán hàng Shopee cực kỳ thân thiện, nhiệt tình và am hiểu tâm lý khách hàng.
        Dữ liệu sản phẩm tìm được: 
        {context}

        NHIỆM VỤ CỦA BẠN:
        1. **Bộ lọc thông minh:** - Xác định xem khách đang tìm loại gì. Chỉ tư vấn sản phẩm khớp với nhu cầu.
           - Nếu context rỗng hoặc không có sản phẩm phù hợp, hãy xin lỗi khéo léo và gợi ý từ khóa khác (VD: "Dạ mẫu này bên em tạm hết, mình thử xem sang mẫu... được không ạ?").

        2. **Phong cách tư vấn:**
           - Dùng giọng văn tự nhiên, vui vẻ (dùng các từ như: "dạ", "nè", "xinh xỉu", "cực hot").
           - Sử dụng Emoji phù hợp (👠, 👗, 🔥, ⭐) để bài viết bắt mắt.
           - **Tuyệt đối không** bịa đặt thông tin không có trong context.

        3. **Xử lý hiển thị (Quan trọng):**
           - **Giá tiền:** Phải quy đổi cho dễ đọc (VD: `12000.0` -> `12k`, `117996.0` -> `118k`).
           - **Tên sản phẩm:** Nếu tên quá dài (chứa từ khóa SEO), hãy gọi ngắn gọn lại cho tự nhiên (VD: "Giày búp bê nữ FREE SHIP..." -> "Giày búp bê Oxford da bóng").
           - **Điểm nhấn:** Nếu sản phẩm có lượt bán cao (trên 1k), hãy khen ngợi (VD: "Mẫu quốc dân đã bán hơn 90k đôi").

        
        4. **KIỂM TRA NGỮ CẢNH (CỰC KỲ QUAN TRỌNG):**
           - So khớp nhu cầu của khách với sản phẩm tìm được. 
           - Nếu sản phẩm tìm thấy KHÔNG liên quan đến nhu cầu (VD: Khách hỏi "đồ Tết" mà kết quả chỉ trả về "đồ lót", hoặc hỏi "nồi cơm" mà kết quả là "áo thun"), bạn KHÔNG ĐƯỢC cố ép chúng vào ngữ cảnh đó.
           - Trường hợp không có đồ phù hợp: Hãy xin lỗi lịch sự, giải thích rằng mẫu đó hiện đang cháy hàng hoặc chưa kịp cập nhật, và gợi ý những sản phẩm hiện đang CÓ SẴN trong kho mà gần giống nhất (hoặc hỏi khách có muốn xem danh mục khác không).
           
        5. **Cấu trúc câu trả lời:**
           - Lời chào + Intro thu hút.
           - Danh sách 3-5 sản phẩm nổi bật nhất (Gạch đầu dòng, kèm giá và ưu điểm).
           - Câu chốt (CTA): Mời khách bấm vào xem ảnh hoặc mua ngay.
           - **Dòng cuối cùng bắt buộc:** `SELECTED_PRODUCTS: [Tên sản phẩm 1], [Tên sản phẩm 2],...` (Lấy NGUYÊN VĂN tên đầy đủ trong context để hệ thống hiển thị thẻ sản phẩm).
        VÍ DỤ OUTPUT MONG MUỐN:
        "Dạ em tìm thấy mấy mẫu giày búp bê xinh lắm nè chị ơi! 😍

        1. **Giày Oxford mũi vuông da bóng**: Em này form siêu đẹp, giá chỉ **89k** thôi mà đã có hơn **90k lượt mua** rồi đó ạ! 🔥
        2. **Giày Lolita Quai Ngọc**: Mẫu này đế độn 4 phân tôn dáng cực, giá **99k**. Chị nhớ đặt lùi 1 size nha.
        ...

        Chị ưng mẫu nào bấm vào xem ảnh chi tiết nha! 👇
        SELECTED_PRODUCTS: Giày bup bê nữ FREE SHIP, giày oxford mũi vuông da bóng siêu đẹp mã 28, Giày Lolita Nữ Quai Ngọc BUỘC NƠ Cao Cấp..."
    """
    prompt = ChatPromptTemplate.from_messages([
        ('system' , system_prompt),
        MessagesPlaceholder('chat_history'),
        ('human' , '{input}')
    ])
    
    chain = prompt | llm | StrOutputParser()
    response_text = chain.invoke({
        'context' : context_str ,
        'input' : state['question'] ,
        "chat_history": state.get('chat_history', [])
    }) 

    return  {'answer' : response_text}

# hàm phân loại xem người dùng đang tìm kiếm sản phẩm hay chat vui vẻ
def classify_chat (state) :
    question = state['question']    
    llm = get_llm ()

    system_prompt = """
        Bạn là bộ định tuyến (Router) thông minh.
    Nhiệm vụ: Phân loại câu hỏi của người dùng vào 1 trong 2 nhóm:
    
    1. "search": Nếu câu hỏi liên quan đến MUA BÁN, SẢN PHẨM, GIÁ CẢ, ĐƠN HÀNG, SHIP, TÌM KIẾM...
       (Ví dụ: "áo thun giá rẻ", "có quần đùi không", "giao hàng bao lâu", "iphone 15")
       
    2. "chat": Nếu là câu chào hỏi xã giao, cảm xúc, hoặc câu hỏi không liên quan đến mua bán.
       (Ví dụ: "xin chào", "bạn là ai", "hôm nay trời đẹp", "cảm ơn", "bạn thông minh quá")
       
    OUTPUT: Chỉ trả về duy nhất 1 từ: "search" hoặc "chat". Không giải thích gì thêm.
    """
    prompt = ChatPromptTemplate.from_messages([
        ('system'  , system_prompt) ,
        ('human' , '{input}')
    ])
    chain = prompt | llm | StrOutputParser()

    response = chain.invoke({
        'input' : question
    })
    return response

# hàm rewrite khi có history và rewrite để tìm kiếm keyword tốt hơn
def rewrite_question(state):
    print("---  REWRITE QUESTION NODE ---")
    
  
    question = state['question']
    chat_history = state.get('chat_history', [])
    retry_count = state.get('retry_count', 0)
    
    history_attempts = state.get('attempts_history', [])
    last_keyword = ""
    if history_attempts:
        last_keyword = history_attempts[-1].get('keyword_used', 'không rõ')
    llm = get_llm()


    if retry_count == 0:
        # --- TRƯỜNG HỢP 1: LẦN ĐẦU TIÊN ---
        # Giữ nguyên logic cũ của bạn: Chỉ làm rõ nghĩa, không bịa đặt.
        instruction = """
        Nhiệm vụ: Viết lại câu hỏi để làm rõ các từ mơ hồ (nó, cái đó, mẫu này...) dựa trên lịch sử chat.
        
        Quy tắc:
        1. Nếu câu hỏi đã rõ nghĩa (VD: "quần nào mặc tết đẹp"), GIỮ NGUYÊN, không thêm thắt.
        2. TUYỆT ĐỐI KHÔNG tự ý gán tên sản phẩm cụ thể nếu khách hỏi mở.
        3. Mục tiêu: Giúp bộ máy tìm kiếm hiểu đúng ý định ban đầu.
        Ví dụ:
        Input: "quần nào mặc tết đẹp nhỉ?"
        Rewrite đúng: "quần nào mặc tết đẹp nhỉ?" (Vì câu này đã rõ nghĩa).
    """
       
    else:
      
        instruction = f"""
        Nhiệm vụ: Người dùng đang tìm kiếm nhưng thất bại với từ khóa trước đó là "{last_keyword}".
        Hãy phân tích và viết lại thành MỘT cụm từ khóa tìm kiếm duy nhất, hiệu quả hơn.

        Chiến thuật sửa đổi (Chỉ chọn 1 chiến thuật phù hợp nhất):
        1. Dùng TỪ ĐỒNG NGHĨA. VD: "Sneaker" -> "Giày thể thao".
        2. Dùng TỪ KHÓA CHUNG HƠN. VD: "Giày da bò màu nâu size 40" -> "Giày da nam".
        3. Bỏ bớt các tính từ quá chi tiết gây nhiễu.

        RÀNG BUỘC ĐẦU RA (OUTPUT FORMAT) TỐI QUAN TRỌNG:
        - CHỈ trả về đúng MỘT cụm từ tìm kiếm duy nhất (tối đa 7 từ).
        - TUYỆT ĐỐI KHÔNG liệt kê nhiều lựa chọn. KHÔNG dùng dấu phẩy.
        - KHÔNG giải thích, KHÔNG xuống dòng, KHÔNG dùng dấu chấm câu.
        - Phải giữ đúng nhu cầu cốt lõi của khách hàng.
        """

    system_prompt = f"""
    Bạn là chuyên gia ngôn ngữ và tối ưu hóa tìm kiếm (SEO Specialist).
    {instruction}
    
    Câu hỏi gốc của người dùng: "{question}"
    """

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}")
    ])

    chain = prompt | llm | StrOutputParser()
    
    new_question = chain.invoke({
        "input": question,
        "chat_history": chat_history
    })
    

    print(f"   ➤ Retry: {retry_count} | Old: {question} -> New: {new_question}")

    new_retry_count = retry_count
    if history_attempts:
         new_retry_count += 1
    return {
        "question_rewrite": new_question,
        "retry_count": new_retry_count
    }

# hàm chat xã giao thôi
def chat_general_node (state) :
    print("--- GENERAL CHAT: Xã giao... ---")
    llm = get_llm()
    system_prompt = """Bạn là trợ lý ảo Shopee thân thiện. 
    Trò chuyện tự nhiên, lái về mua sắm nếu khách đi quá xa."""
    prompt = ChatPromptTemplate.from_messages([
        ('system' , system_prompt) ,
        ('human' , '{input}')
    ])
    chain = prompt | llm |StrOutputParser()
    response = chain.invoke({
        "input" : state['question']
    })
    return {'answer' : response}




def grader_node(state):
    print("--- ⚖️ GRADER: Đang chấm điểm (Đã sửa lỗi) ---")
    
    question = state.get('question', '')
    keyword = state.get('keyword', '')
    target = keyword if keyword else question
    
    context_raw = state.get('context', [])
    
    # 1. XỬ LÝ CONTEXT AN TOÀN HƠN
    # Dùng json.dumps để giữ nguyên cấu trúc object, tránh cắt chuỗi giữa chừng làm hỏng dữ liệu
    if isinstance(context_raw, list):
        context_list = []
        for c in context_raw:
            if isinstance(c, dict):
                context_list.append(json.dumps(c, ensure_ascii=False))
            else:
                context_list.append(str(c))
        # Ghép lại và giới hạn độ dài tổng thể thay vì cắt từng object
        context_str = "\n".join(context_list)[:3000]
    else:
        context_str = str(context_raw)[:3000]

    if not context_raw or not context_str.strip():
        print("   ⚠️ Context rỗng -> Auto 0 điểm")
        return {"attempts_history": [{"context": [], "score": 0.0, "keyword_used": keyword}]}

    llm = get_llm() # Đảm bảo hàm này được định nghĩa ở file của bạn
    
    # 2. PROMPT ĐÃ ĐƯỢC BỔ SUNG {context}
    system_prompt = """BẠN LÀ MÁY CHẤM ĐIỂM SẢN PHẨM.

NHIỆM VỤ: Kiểm tra xem trong Danh sách sản phẩm dưới đây có sản phẩm nào khớp hoặc liên quan đến từ khóa "{target}" hay không.

DANH SÁCH SẢN PHẨM (CONTEXT):
{context}

QUY TẮC CHẤM ĐIỂM:
- Trả về 1.0: Nếu có ít nhất một sản phẩm đúng hoặc liên quan chặt chẽ đến "{target}".
- Trả về 0.0: Nếu không có sản phẩm nào liên quan (Ví dụ tìm "áo dài" mà ra "ví", "đồ lót").

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (Chỉ xuất JSON, không giải thích gì thêm):
{{"score": 1.0}} hoặc {{"score": 0.0}}"""
    
    prompt = ChatPromptTemplate.from_messages([('system', system_prompt)])
    chain = prompt | llm | StrOutputParser()

    score = 0.0
    try:
        raw_output = chain.invoke({'target': target, 'context': context_str})
        
        score_match = re.search(r'"score"\s*:\s*([0-9.]+)', raw_output, re.IGNORECASE)
        
        if score_match:
            score = float(score_match.group(1))
        else:
            print(f"   ⚠️ Không tìm thấy key 'score', đang quét số...")
            numbers = re.findall(r"0\.\d+|1\.0|0|1", raw_output)
            if numbers:
                score = float(numbers[0])
            
    except Exception as e:
        print(f"❌ Grader Lỗi: {e}")
        score = 0.0

    print(f"   📊 Target: '{target}' | Điểm: {score}")

    return {
        "attempts_history": [{
            "context": context_raw,
            "score": score,
            "keyword_used": keyword
        }]
    }
# hàm chọn ra attempts_history ổn nhất
def selector_node (state):
    print("--- 🏆 SELECTOR: Đang chọn kết quả tốt nhất... ---")
    history = state.get('attempts_history' , [])
    if not history :
        print(" Không có lịch sử tìm kiếm.")
        return {
            "context": "",
            "score": 0.0
        }
    best_attempt = max(history, key=lambda x: x['score'])
    return {
        "context": best_attempt['context'],       
        "keyword": best_attempt.get('keyword_used'),
        "score": best_attempt['score']          
    }


