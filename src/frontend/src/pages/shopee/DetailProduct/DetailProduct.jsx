import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { trackProductView } from '../../../services/product';
import ReviewModal from '../../../components/ReviewModal/ReviewModal';
import './style.scss';

function DetailProduct() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');

  // --- State cho đánh giá ---
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewStats, setReviewStats] = useState({ average_rating: 0, total: 0 });
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  // Lưu orderId để gửi kèm review (truyền từ ngoài hoặc lấy từ session)
  const [reviewOrderId, setReviewOrderId] = useState(null);

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

  // --- Fetch đánh giá sản phẩm ---
  useEffect(() => {
    if (!id) return;

    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await axios.get(`http://localhost:8000/reviews/product/${id}`, {
          params: { page: reviewPage, limit: 5 }
        });
        if (res.data.status === 'success') {
          setReviews(prev => reviewPage === 1
            ? res.data.data.reviews
            : [...prev, ...res.data.data.reviews]
          );
          setReviewStats(res.data.data.stats);
          setReviewTotalPages(res.data.data.pagination.total_pages);
        }
      } catch (err) {
        console.error('Lỗi tải đánh giá:', err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [id, reviewPage]);

  const handleQuantityChange = (type) => {
    if (type === 'decrease' && quantity > 1) {
      setQuantity(quantity - 1);
    } else if (type === 'increase' && quantity < (product?.stock || 999)) {
      setQuantity(quantity + 1);
    }
  };

  // Mở modal đánh giá — tìm orderId từ danh sách orders đã hoàn thành của khách
  const handleOpenReviewModal = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Vui lòng đăng nhập để đánh giá.');
      return;
    }
    try {
      const res = await axios.get('http://localhost:8000/orders/customer/get-status/COMPLETED', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 20, page: 1 }
      });
      const orders = res.data?.data || [];

      // Tìm order chứa product hiện tại và chưa được đánh giá
      let matchedOrder = null;
      for (const order of orders) {
        const hasProduct = order.items?.some(item => item.product_id === Number(id));
        if (hasProduct) {
          matchedOrder = order;
          break;
        }
      }

      if (!matchedOrder) {
        alert('Bạn cần hoàn thành đơn hàng chứa sản phẩm này trước khi đánh giá.');
        return;
      }

      setReviewOrderId(matchedOrder.id);
      setShowReviewModal(true);
    } catch (err) {
      console.error('Lỗi tìm đơn hàng:', err);
      alert('Không thể kiểm tra đơn hàng. Vui lòng thử lại.');
    }
  };

  const handleReviewSubmitted = () => {
    setReviewPage(1);
    // Reload reviews
    const reload = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/reviews/product/${id}`, {
          params: { page: 1, limit: 5 }
        });
        if (res.data.status === 'success') {
          setReviews(res.data.data.reviews);
          setReviewStats(res.data.data.stats);
          setReviewTotalPages(res.data.data.pagination.total_pages);
        }
      } catch {}
    };
    reload();
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
                <span className="number">{reviewStats.average_rating > 0 ? reviewStats.average_rating.toFixed(1) : 'Chưa có'}</span>
                {reviewStats.average_rating > 0 && (
                  <span className="stars">
                    {renderStars(reviewStats.average_rating)}
                  </span>
                )}
                {!reviewStats.average_rating && <span className="no-rating">Đánh giá</span>}
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

            <div className="review-cta">
              <button className="btn-write-review" onClick={handleOpenReviewModal}>
                📝 Viết Đánh Giá
              </button>
            </div>
          </div>
        </div>

        {/* PHẦN ĐÁNH GIÁ */}
        <div className="product-reviews-box">
          <div className="box-header">
            <span>ĐÁNH GIÁ SẢN PHẨM</span>
            {reviewStats.total > 0 && (
              <span className="review-count-badge">{reviewStats.total} đánh giá</span>
            )}
          </div>

          {/* Tổng quan */}
          {reviewStats.total > 0 && (
            <div className="reviews-overview">
              <div className="overview-score">
                <span className="big-score">{reviewStats.average_rating.toFixed(1)}</span>
                <span className="over">/ 5</span>
              </div>
              <div className="overview-stars">
                {renderStars(reviewStats.average_rating)}
              </div>
            </div>
          )}

          {/* Danh sách đánh giá */}
          {reviewsLoading ? (
            <div className="reviews-loading">Đang tải đánh giá...</div>
          ) : reviews.length === 0 ? (
            <div className="reviews-empty">
              <p>Chưa có đánh giá nào cho sản phẩm này.</p>
              <p>Hãy là người đầu tiên đánh giá!</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="reviewer-info">
                      <span className="reviewer-avatar">
                        {review.customer_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                      <span className="reviewer-name">{review.customer_name}</span>
                    </div>
                    <div className="review-meta">
                      <span className="review-stars">{renderStars(review.rating)}</span>
                      <span className="review-date">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="review-content">{review.content}</p>
                  {review.sentiment_score !== 0 && (
                    <div className={`sentiment-badge sentiment-${getSentimentClass(review.sentiment_score)}`}>
                      {review.sentiment_label}
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {reviewPage < reviewTotalPages && (
                <button
                  className="btn-load-more-reviews"
                  onClick={() => setReviewPage(p => p + 1)}
                >
                  Xem thêm đánh giá
                </button>
              )}
            </div>
          )}
        </div>

        <div className="product-description-box">
          <div className="box-header">MÔ TẢ SẢN PHẨM</div>
          <div className="box-content">
            <p style={{ whiteSpace: 'pre-wrap' }}>{product.description}</p>
          </div>
        </div>
      </div>

      {/* MODAL ĐÁNH GIÁ */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onReviewSubmitted={handleReviewSubmitted}
        productId={Number(id)}
        orderId={reviewOrderId}
      />
    </div>
  );
}

// --- Helper functions ---
function renderStars(score) {
  const full = Math.floor(score);
  const half = score - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <>
      {'★'.repeat(full)}
      {half === 1 && '½'}
      {'☆'.repeat(empty)}
    </>
  );
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getSentimentClass(score) {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

export default DetailProduct;