import React from 'react';
import CartItem from '../CartItem';
import './style.scss'
function ShopGroup({ shop, selectedIds, onToggleShop, onToggleItem, onQuantityChange, onRemove }) {
  // Lấy danh sách ID của các món trong shop này
  const shopItemIds = shop.items.map(i => i.cart_id);
  // Kiểm tra xem tất cả món trong shop đã được chọn chưa
  const isShopSelected = shopItemIds.every(id => selectedIds.includes(id)) && shopItemIds.length > 0;

  return (
    <div className="shop-group-box">
      {/* Header Shop */}
      <div className="shop-header">
        <input 
          type="checkbox" 
          checked={isShopSelected} 
          onChange={() => onToggleShop(shop.shop_id)} 
        />
        <span className={`shop-badge ${shop.shop_badge === 'Mall' ? 'mall' : 'favorite'}`}>
          {shop.shop_badge}
        </span>
        <span className="shop-name">{shop.shop_name}</span>
        <span className="chat-icon">💬</span>
      </div>

      {/* Danh sách sản phẩm của Shop đó */}
      <div className="shop-items-list">
        {shop.items.map((item) => (
          <CartItem 
            key={item.cart_id}
            item={item}
            shopId={shop.shop_id}
            isSelected={selectedIds.includes(item.cart_id)}
            onToggleItem={onToggleItem}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Footer Shop */}
      <div className="shop-footer">
        <div className="voucher-line">🎫 Thêm Shop Voucher</div>
        <div className="freeship-line">
          🚚 Giảm 500.000₫ phí vận chuyển đơn tối thiểu 0₫ <a href="#">Tìm hiểu thêm</a>
        </div>
      </div>
    </div>
  );
}

export default ShopGroup;