import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProductCard from '../../../components/ProductCart/ProductCart';
import ChatWidget from '../../../components/ChatWidget/ChatWidget';
import { isCustomerLoggedIn } from '../../../utils/auth';
import './style.scss'; 

function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chỉ gọi API lấy sản phẩm
  useEffect(() => {
    const fetchRandomProducts = async () => {
      try {
        const response = await axios.get('http://localhost:8000/product/public/random?limit=24');
        if (response.data.status === 'success') {
          setProducts(response.data.data);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu bài test:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRandomProducts();
  }, []);

  return (
    <div className="test-home-container">

      {/* KHU VỰC SẢN PHẨM */}
      <div className="main-content">
        <div className="daily-discover">
          <div className="discover-header">
            <h3> GỢI Ý HÔM NAY</h3>
          </div>
          
          {loading ? (
             <div style={{textAlign: 'center', padding: '50px'}}>Đang tải dữ liệu...</div>
          ) : (
            <div className="product-grid">
              {products.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CHATBOT CHỈ HIỆN KHI USER LÀ CUSTOMER ĐÃ ĐĂNG NHẬP */}
      {isCustomerLoggedIn() && <ChatWidget />}
    </div>
  );
}

export default HomePage;