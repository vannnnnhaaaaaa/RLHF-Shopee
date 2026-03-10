import React from 'react';
import './style.scss';
function CartItem({ item, shopId, isSelected, onToggleItem, onQuantityChange, onRemove }) {
  return (
    <div className="cart-item-row">
      <div className="col-checkbox">
        <input 
          type="checkbox" 
          checked={isSelected} 
          onChange={() => onToggleItem(item.cart_id)} 
        />
      </div>
      
      <div className="col-product">
        <img src={item.image} alt={item.name} />
        <div className="product-info">
          <div className="name text-truncate">{item.name}</div>
          <div className="promo-badge">VOUCHER XTRA</div>
        </div>
        <div className="variant-dropdown">
          <span className="label">Phân Loại Hàng: ▾</span>
          <div className="val">{item.variant}</div>
        </div>
      </div>
      
      <div className="col-price">
        {item.price.toLocaleString('vi-VN')}₫
      </div>
      
      <div className="col-quantity">
        <div className="qty-control">
          <button onClick={() => onQuantityChange(shopId, item.cart_id, 'decrease')}>-</button>
          <input type="text" value={item.quantity} readOnly />
          <button onClick={() => onQuantityChange(shopId, item.cart_id, 'increase')}>+</button>
        </div>
      </div>
      
      <div className="col-total">
        {(item.price * item.quantity).toLocaleString('vi-VN')}₫
      </div>
      
      <div className="col-actions">
        <span className="btn-delete" onClick={() => onRemove(item.cart_id)}>Xóa</span>
        <span className="btn-find-similar">Tìm sản phẩm tương tự ▾</span>
      </div>
    </div>
  );
}

export default CartItem;