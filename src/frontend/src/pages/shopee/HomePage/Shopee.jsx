import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../../../components/ProductCart';
import './style.scss';

function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // [QUAN TRỌNG 2]: Khởi tạo hook và trích xuất chữ "keyword"
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get('keyword');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true); // Bật loading mỗi khi bắt đầu call API mới
      try {
        let response;

        // [QUAN TRỌNG 3]: Phân nhánh logic - Nếu có keyword thì search, không thì random
        if (keyword) {
          // Dùng encodeURIComponent để an toàn khi từ khóa có dấu cách, tiếng Việt
          response = await axios.get(`http://localhost:8000/product/search?keyword=${encodeURIComponent(keyword)}`);
        } else {
          response = await axios.get('http://localhost:8000/product/public/random?limit=24');
        }

        // Cập nhật state nếu Backend trả về success
        if (response.data.status === 'success') {
          // Xử lý trường hợp search rỗng (Backend có thể trả data rỗng)
          setProducts(response.data.data || []);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu sản phẩm:", error);
        setProducts([]); // Lỗi thì set mảng rỗng để không bị crash map()
      } finally {
        setLoading(false); // Tắt loading
      }
    };

    fetchProducts();

  // [QUAN TRỌNG 4]: Phải có biến keyword ở đây!
  // Mỗi khi chữ keyword trên URL thay đổi, React sẽ tự động chạy lại cái useEffect này.
  }, [keyword]);

  return (
    <div className="test-home-container">

      {/* KHU VỰC SẢN PHẨM */}
      <div className="main-content">
        <div className="daily-discover">
          <div className="discover-header">
            {/* Tiêu đề tự động thay đổi theo trạng thái */}
            <h3>
              {keyword 
                ? `KẾT QUẢ TÌM KIẾM: "${keyword.toUpperCase()}"` 
                : 'GỢI Ý HÔM NAY'}
            </h3>
          </div>
          
          {loading ? (
             <div style={{textAlign: 'center', padding: '50px'}}>Đang tải dữ liệu...</div>
          ) : products && products.length > 0 ? (
            <div className="product-grid">
              {products.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          ) : (
             // Xử lý giao diện khi không tìm thấy sản phẩm nào
             <div style={{textAlign: 'center', padding: '50px', color: '#888'}}>
               <p style={{fontSize: '1.2rem', marginBottom: '10px'}}>Không tìm thấy sản phẩm nào phù hợp.</p>
               <p>Bạn thử dùng từ khóa khác chung chung hơn xem sao nhé!</p>
             </div>
          )}
        </div>
      </div>

      {/* Chatbot được quản lý bởi CustomerLayout — KHÔNG đặt ở đây */}
    </div>
  );
}

export default HomePage;