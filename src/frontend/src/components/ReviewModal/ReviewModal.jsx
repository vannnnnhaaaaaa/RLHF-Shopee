import React, { useState } from 'react';
import axios from 'axios';
import './style.scss';

const STAR_LABELS = ['', 'Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];

function ReviewModal({ isOpen, onClose, onReviewSubmitted, productId, orderId }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá.');
      return;
    }
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung đánh giá.');
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('access_token');

    try {
      const response = await axios.post(
        'http://localhost:8000/reviews/create',
        {
          product_id: productId,
          order_id: orderId,
          rating,
          content: content.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        onReviewSubmitted && onReviewSubmitted();
        onClose();
        setRating(0);
        setContent('');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="review-modal-overlay" onClick={handleOverlayClick}>
      <div className="review-modal-content">
        {/* Header */}
        <div className="review-modal-header">
          <h3>Đánh Giá Sản Phẩm</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <form className="review-form" onSubmit={handleSubmit}>
          {/* Chọn sao */}
          <div className="star-picker">
            <p className="picker-label">Bạn hài lòng với sản phẩm không?</p>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${star <= (hoverRating || rating) ? 'active' : ''}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  title={STAR_LABELS[star]}
                >
                  ★
                </button>
              ))}
            </div>
            {(hoverRating || rating) > 0 && (
              <p className="star-hint">{STAR_LABELS[hoverRating || rating]}</p>
            )}
          </div>

          {/* Textarea nhận xét */}
          <div className="content-field">
            <p className="picker-label">Viết nhận xét của bạn</p>
            <textarea
              className="review-textarea"
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={1000}
            />
            <p className="char-count">{content.length} / 1000</p>
          </div>

          {/* Lỗi */}
          {error && <p className="error-msg">{error}</p>}

          {/* Actions */}
          <div className="review-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;
