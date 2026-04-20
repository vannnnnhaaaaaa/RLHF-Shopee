import React from 'react';
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
  const productIds = productsIdString
    ? productsIdString.split(',').map(id => id.trim())
    : [];

  // 2. CHIA ĐOẠN CHAT THÀNH TỪNG DÒNG
  const lines = chatText.split('\n').filter(line => line.trim() !== '');

  // 3. HÀM CHUYỂN HƯỚNG THẲNG BẰNG ID
  const handleProductClick = (productId) => {
    if (!productId || productId === "") {
      console.warn("Không tìm thấy ID sản phẩm tương ứng");
      return;
    }
    navigate(`/customer/product/${productId}`);
  };

  // 4. DETECT DÒNG SẢN PHẨM
  // Pattern: "1. Tên sp - Gia: X VND - Da ban: Y"
  const PRODUCT_LINE_REGEX = /^(\d+)\.\s*(.+?)\s*-\s*Gia:\s*([\d.,]+)\s*VND\s*-\s*Da ban:\s*([\d,]+)/;

  let productCounter = 0;

  return (
    <div className="formatted-message">
      <div className="chat-text">
        {lines.map((line, index) => {
          const trimmed = line.trim();

          // Dòng sản phẩm có pattern "1. Tên - Gia: X VND - Da ban: Y"
          const match = PRODUCT_LINE_REGEX.exec(trimmed);

          if (match) {
            const currentId = productIds[productCounter] || '';
            productCounter++;

            const [, indexNum, productName, priceText, soldText] = match;
            const soldCount = parseInt(soldText.replace(/,/g, ''), 10);

            // Format số bán: 1200 → "1.2k"
            const formatSold = (n) => {
              if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
              return n.toString();
            };

            return (
              <div
                key={index}
                className="product-line-wrapper"
                onClick={() => handleProductClick(currentId)}
                title="Bấm để xem chi tiết"
              >
                <span className="product-index">{indexNum}.</span>
                <div className="product-info">
                  <span className="product-name">{productName}</span>
                  <div className="product-meta">
                    <span className="product-price">{parseInt(priceText.replace(/,/g, ''), 10).toLocaleString()} VND</span>
                    <span className="product-sold-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                      </svg>
                      Đã bán {formatSold(soldCount)}
                    </span>
                  </div>
                </div>
                <svg
                  className="product-arrow"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );
          }

          // Dòng thường → render markdown thuần
          return (
            <div
              key={index}
              className="chat-line"
              dangerouslySetInnerHTML={{
                __html: trimmed
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                  .replace(/`(.+?)`/g, '<code>$1</code>')
                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  .replace(/#+\s*(.+)/g, '<strong>$1</strong>')
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default MessageFormatter;
