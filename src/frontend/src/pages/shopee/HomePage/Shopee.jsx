import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
// import { getProduct } from '../../services/product'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer';
import ProductCard from '../../../components/ProductCart'; // Đổi tên file cho chuẩn 'ProductCard' nhé
import './style.scss'; // File CSS cho trang chủ

function Shopee() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gọi API lấy dữ liệu ngay khi vừa vào trang
  useEffect(() => {
    const fetchRandomProducts = async () => {
      try {
        // Gọi API public không cần truyền token
        const response = await axios.get('http://localhost:8000/product/public/random?limit=24');
        if (response.data.status === 'success') {
          setProducts(response.data.data);
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRandomProducts();
  }, []); // [] đảm bảo chỉ chạy 1 lần khi load trang

  return (
    <div className="shopee-home-container">
      <Navbar />
      <div className="shopee-main-content">
        <div className="daily-discover">
          <div className="discover-header">
            <h3>GỢI Ý HÔM NAY</h3>
          </div>
          
          {loading ? (
             <div style={{textAlign: 'center', padding: '50px'}}>Đang tải Gợi ý hôm nay...</div>
          ) : (
            <div className="product-grid">
              {products.map((item) => (
                <ProductCard key={item.id} product={item}   />
                
              ))}
            </div>
          )}
          
        </div>
      </div>
      <Footer/>
    </div>
  );
}

export default Shopee;