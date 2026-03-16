import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import ProductCard from '../../../components/ProductCart/ProductCart';
// CHỈ IMPORT CHATWIDGET VÀO ĐÂY LÀ ĐỦ

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



      {/* GỌI CHATBOT RA MÀN HÌNH CHÍNH (Chỉ 1 dòng này là đủ) */}


    </div>
  );
}

export default HomePage;