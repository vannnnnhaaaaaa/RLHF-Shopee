import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { trackProductView } from '../../../services/product';
import './style.scss';

function DetailProduct() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    const fetchProductDetail = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:8000/product/public/${id}`);
        
        if (response.data.status === 'success') {
          const rawData = response.data.data;
          
          // --- XỬ LÝ TÍNH TOÁN GIÁ CẢ Ở ĐÂY ---
          const originalPrice = rawData.price || 0;
          const discountPercent = rawData.discount_percent || 0;
          
          // Tính giá màu đỏ (Giá bán cuối cùng)
          const finalPrice = discountPercent > 0 
            ? Math.round(originalPrice * (1 - discountPercent / 100)) 
            : originalPrice;

          // "Đắp" dữ liệu thật vào cấu trúc
          const safeProduct = {
            ...rawData,
            // Ghi đè lại 2 cột giá cho chuẩn
            original_price: originalPrice, // Giá xám gạch ngang
            price: finalPrice,             // Giá đỏ (đã giảm)
            discount_percent: discountPercent,
            
            // Xử lý hình ảnh
            images: rawData.images && Array.isArray(rawData.images) && rawData.images.length > 0
              ? rawData.images.map(img => img.image_url)
              : (rawData.image_link ? [rawData.image_link] : ['https://via.placeholder.com/500?text=No+Image']),
            
            rating: 5.0, 
            sold_count: rawData.sold_count || 0,
            description: rawData.description || "Chưa có mô tả cho sản phẩm này."
          };

          setProduct(safeProduct);
          setActiveImage(safeProduct.images[0]);
        }
      } catch (error) {
        console.error("Lỗi tải chi tiết:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
    // Ghi nhận lượt xem (sessionStorage chống spam F5)
    trackProductView(id);
  }, [id]);

  const handleQuantityChange = (type) => {
    if (type === 'decrease' && quantity > 1) {
      setQuantity(quantity - 1);
    } else if (type === 'increase' && quantity < (product?.stock || 999)) {
      setQuantity(quantity + 1);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('access_token'); 
    
    if (!token) {
      alert("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8000/cart/add', 
        {
          product_id: product.id,
          quantity: quantity
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.status === 'success') {
        alert(`🛒 Thêm thành công ${quantity} sản phẩm vào giỏ hàng!`);
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } catch (error) {
      if (error.response && error.response.data) {
        alert(`❌ Lỗi: ${error.response.data.detail}`);
      } else {
        alert("❌ Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.");
        console.error("Lỗi add to cart:", error);
      }
    }
  };

  const handleBuyNow = async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      alert("Vui lòng đăng nhập để mua sản phẩm!");
      navigate('/customer/login');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8000/cart/add', 
        {
          product_id: product.id,
          quantity: quantity
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.status === 'success') {
        window.dispatchEvent(new Event('cartUpdated'));
        navigate('/customer/cartitem', {
          state: { autoSelectProductId: product.id }
        });
      }
    } catch (error) {
      if (error.response && error.response.data) {
        alert(`❌ Lỗi: ${error.response.data.detail}`);
      } else {
        alert("❌ Có lỗi xảy ra. Vui lòng thử lại sau.");
        console.error("Lỗi Buy Now:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="detail-page-container">
        <div style={{ textAlign: 'center', padding: '100px 0' }}>Đang tải chi tiết sản phẩm...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="detail-page-container">
        <div style={{ textAlign: 'center', padding: '100px 0', color: 'red' }}>
          Sản phẩm không tồn tại hoặc đã bị gỡ!
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page-container">
      <div className="detail-main-content">
        <div className="breadcrumb">
          <span onClick={() => navigate('/')}>Trang chủ</span> {'>'} 
          <span> {product.category || 'Danh mục'} </span> {'>'} 
          <span className="current">{product.name}</span>
        </div>

        <div className="product-overview-box">
          <div className="image-section">
            <div className="main-image">
              <img src={activeImage} alt={product.name} />
            </div>
            <div className="thumbnail-list">
              {product.images.map((img, index) => (
                <div 
                  key={index} 
                  className={`thumbnail ${activeImage === img ? 'active' : ''}`}
                  onMouseEnter={() => setActiveImage(img)}
                >
                  <img src={img} alt={`thumb-${index}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="info-section">
            <h1 className="product-title">{product.name}</h1>
            
            <div className="product-stats">
              <div className="rating">
                <span className="number">{product.rating}</span>
                <span className="stars">⭐⭐⭐⭐⭐</span>
              </div>
              <div className="divider"></div>
              <div className="sold">
                <span className="number">
                  {product.sold_count >= 1000 ? (product.sold_count/1000).toFixed(1) + 'k' : product.sold_count}
                </span>
                <span className="label">Đã bán</span>
              </div>
            </div>

            <div className="price-box">
              {/* Giá gạch ngang màu xám */}
              {product.discount_percent > 0 && (
                <span className="original-price">₫{product.original_price.toLocaleString('vi-VN')}</span>
              )}
              
              {/* Giá đỏ đã được tính toán */}
              <span className="current-price">₫{product.price?.toLocaleString('vi-VN')}</span>
              
              {product.discount_percent > 0 && (
                <span className="discount-badge">{product.discount_percent}% GIẢM</span>
              )}
            </div>

            <div className="shipping-info">
              <span className="label">Vận chuyển</span>
              <span className="value">Miễn phí vận chuyển</span>
            </div>

            <div className="quantity-selector">
              <span className="label">Số lượng</span>
              <div className="control-group">
                <button onClick={() => handleQuantityChange('decrease')}>-</button>
                <input type="text" value={quantity} readOnly />
                <button onClick={() => handleQuantityChange('increase')}>+</button>
              </div>
              <span className="stock-info">{product.stock} sản phẩm có sẵn</span>
            </div>

            <div className="action-buttons">
              <button className="btn-add-to-cart" onClick={() => handleAddToCart()}>
                🛒 Thêm Vào Giỏ Hàng
              </button>
              <button className="btn-buy-now" onClick={handleBuyNow}>Mua Ngay</button>
            </div>
          </div>
        </div>

        <div className="product-description-box">
          <div className="box-header">MÔ TẢ SẢN PHẨM</div>
          <div className="box-content">
            <p style={{ whiteSpace: 'pre-wrap' }}>{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailProduct;