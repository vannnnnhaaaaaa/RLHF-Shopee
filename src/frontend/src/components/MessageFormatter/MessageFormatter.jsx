import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import './style.scss';

function MessageFormatter({ rawText }) {
  const navigate = useNavigate();
  if (!rawText) return null;

  // 1. TÁCH TEXT VÀ LẤY MẢNG ID
  const parts = rawText.split(/SELECTED_PRODUCTS:/i);
  let chatText = parts[0].trim();
  chatText = chatText.replace(/👇\s*$/, '').trim();

  // Lấy mảng ID (Ví dụ AI trả về: "15, 22, 109")
  const productsIdString = parts[1] ? parts[1].trim() : null;
  const productIds = productsIdString ? productsIdString.split(',').map(id => id.trim()) : [];

  // 2. CHIA ĐOẠN CHAT THÀNH TỪNG DÒNG
  const lines = chatText.split('\n').filter(line => line.trim() !== '');

  // 3. HÀM CHUYỂN HƯỚNG THẲNG BẰNG ID (KHÔNG CẦN CALL API SEARCH)
  const handleProductClick = (productId) => {
    if (!productId || productId === "") {
        console.warn("Không tìm thấy ID sản phẩm tương ứng");
        return;
    }
   
    navigate(`/customer/product/${productId}`);
  };

  let productCounter = 0; 

  return (
    <div className="formatted-message">
      <div className="chat-text">
        {lines.map((line, index) => {
          // Kiểm tra xem dòng này có phải dòng mô tả sản phẩm (1. **, 2. **)
          const isProductLine = 
            (/^\d+\./.test(line.trim()) || line.includes(':')) && 
            !line.toLowerCase().includes('ưng mẫu nào') && 
            index > 0;

          if (isProductLine) {
            // Lấy ID tương ứng từ mảng productIds dựa trên số thứ tự xuất hiện
            const currentId = productIds[productCounter];
            productCounter++;

            return (
              <div
                key={index}
                onClick={() => handleProductClick(currentId)}
                className="clickable-text-line"
                title="Bấm để xem chi tiết"
              >
                <ReactMarkdown>{line}</ReactMarkdown>
              </div>
            );
          } else {
            return (
              <div key={index} style={{ marginBottom: '10px' }}>
                <ReactMarkdown>{line}</ReactMarkdown>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

export default MessageFormatter;