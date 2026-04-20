// ShopGroup.jsx
import React, { useState } from 'react';
import CartItem from '../CartItem';
import VoucherModal from '../VoucherModal';
import { calculateShopDiscount } from '../../services/product';
import './style.scss';

function ShopGroup({ shop, selectedIds, onToggleShop, onToggleItem, onQuantityChange, onRemove, appliedVoucher, onApplyVoucher }) {
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [showVoucherWarning, setShowVoucherWarning] = useState(false);

  const shopItemIds = shop.items.map(i => i.cart_id);
  const isShopSelected = shopItemIds.every(id => selectedIds.includes(id)) && shopItemIds.length > 0;
  const hasSelectedItems = shopItemIds.some(id => selectedIds.includes(id));

  // Số tiền được giảm từ voucher (chỉ tính trên items đã tick)
  const discountAmount = calculateShopDiscount(shop.items, selectedIds, appliedVoucher);

  const handleApplyVoucher = (voucher) => {
    setIsVoucherModalOpen(false);
    onApplyVoucher(shop.shop_id, voucher);
  };

  // Mở modal voucher: chỉ bật khi shop có ít nhất 1 sản phẩm được chọn
  const handleOpenVoucherModal = () => {
    if (!hasSelectedItems) {
      setShowVoucherWarning(true);
      setTimeout(() => setShowVoucherWarning(false), 3000);
      return;
    }
    setIsVoucherModalOpen(true);
  };

  return (
    <div className="shop-group-box">
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

      <div className="shop-footer">
        {/* Khu vực nhấn Voucher - chỉ bật khi có ít nhất 1 sản phẩm được chọn */}
        <div
          className={`voucher-line ${!hasSelectedItems ? 'voucher-disabled' : ''}`}
          style={{ cursor: hasSelectedItems ? 'pointer' : 'not-allowed', color: appliedVoucher ? '#ee4d2d' : '#333', opacity: !hasSelectedItems ? 0.5 : 1 }}
          onClick={handleOpenVoucherModal}
        >
          {showVoucherWarning && (
            <span style={{ color: '#ee4d2d', fontSize: '12px', marginRight: '6px' }}>
              Vui lòng chọn sản phẩm trước!
            </span>
          )}
          🎫 {appliedVoucher
            ? discountAmount > 0
              ? `Đã chọn: ${appliedVoucher.code} (−${discountAmount.toLocaleString('vi-VN')}₫)`
              : `Đã chọn: ${appliedVoucher.code} (không đủ điều kiện)`
            : 'Thêm Shop Voucher'
          }
        </div>
        
        <div className="freeship-line">
          🚚 Giảm 500.000₫ phí vận chuyển đơn tối thiểu 0₫ <a href="#">Tìm hiểu thêm</a>
        </div>
      </div>

      {/* --- Nhúng Modal vào cuối file --- */}
      <VoucherModal 
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        shopId={shop.shop_id}
        shopName={shop.shop_name}
        onApplyVoucher={handleApplyVoucher}
      />
    </div>
  );
}

export default ShopGroup;