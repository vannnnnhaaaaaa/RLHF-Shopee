import React, { useEffect, useState } from 'react';
import axios from 'axios'; // BẮT BUỘC IMPORT AXIOS
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import ShopGroup from '../../../components/ShopGroup';
import { billService } from '../../../services/bill';
import './style.scss';

function Cart() {
  const [cartData, setCartData] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // Sửa lại tên biến cho chuẩn: chứa mảng ID
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false)
  // 1. GỌI API KHI MỞ TRANG
  useEffect(() => {
    const fetchMyCart = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert("Vui lòng đăng nhập!");
        window.location.href = '/login';
        return;
      }

      try {
        const response = await axios.get('http://localhost:8000/cart/my-cart', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.status === 'success') {
          setCartData(response.data.data);
        }
      } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyCart();
  }, []);

  // 2. TÍNH TOÁN DỮ LIỆU TỰ ĐỘNG (Phần này bạn bị thiếu)
  const handleCheckout = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      // 1. Lấy ra danh sách các item đang được tick chọn
      const selectedItems = cartData
        .flatMap(shop => shop.items)
        .filter(item => selectedIds.includes(item.cart_id));

      // 2. Map dữ liệu sang chuẩn CreateBillDetail của Backend
      const billDetails = selectedItems.map(item => ({
        product_id: item.product_id, // Đảm bảo API cart trả về cả product_id
        quantity: item.quantity,
        price_at_purchase: item.price
      }));

      // 3. Khởi tạo payload hóa đơn (Cập nhật cho khớp Schema)
      const payload = {

        total_price: totalAmount,
        total_shipping: 30000, // Phí ship mặc định

        // Trạng thái đơn và thanh toán
        status: "pending",
        payment_method: "COD",
        payment_status: "pending", // Đã bổ sung

        // Dữ liệu Khuyến mãi (Tạm thời gán 0/null nếu chưa có UI chọn voucher)
        discount_product: 0.0,
        discount_shipping: 0.0,
        shopee_voucher_id: null,
        seller_voucher_id: null,

        // Mảng chi tiết sản phẩm
        details: billDetails
      };
      console.log('2')
      // 4. Gọi API tạo Bill
      const newBill = await billService.createBill(payload);
      console.log("Tạo đơn hàng thành công:", newBill);

      // 5. Sau khi mua thành công, xóa các sản phẩm đó khỏi giỏ hàng
      // Có thể gọi lại hàm xóa hàng loạt hoặc reset state
      alert("Đặt hàng thành công!");

      // Xóa các sản phẩm đã mua khỏi UI
      const newData = cartData.map(shop => ({
        ...shop,
        items: shop.items.filter(item => !selectedIds.includes(item.cart_id))
      })).filter(shop => shop.items.length > 0);

      setCartData(newData);
      setSelectedIds([]);

    } catch (error) {
      // Dùng console.dir để xem toàn bộ cấu trúc object thay vì dạng string
      console.dir(error);

      // Kiểm tra xem lỗi có phải do Backend trả về không (có response)
      if (error.response) {
        // FastAPI mặc định bọc dữ liệu lỗi trong field 'detail'
        const errorDetail = error.response.data.detail;

        console.log("Chi tiết lỗi từ Backend:", errorDetail);

        // Kiểm tra đúng mã lỗi để điều hướng
        if (errorDetail && errorDetail.code === 'MISSING_INFO') {
          alert(errorDetail.message); // Báo: "Vui lòng cập nhật đầy đủ..."
          window.location.href = '/customer/account';
          return; // Dừng lại ở đây, không chạy xuống dòng alert chung chung bên dưới
        }
      }

      // Nếu là các lỗi khác (500, mất mạng, timeout...)
      alert("Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại!");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. HIỂN THỊ GIAO DIỆN
  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Đang tải giỏ hàng...</div>;
  // Lấy ra tất cả cart_id có trong giỏ hàng
  const allCartIds = cartData.flatMap(shop => shop.items).map(i => i.cart_id);

  // Kiểm tra xem số lượng tick chọn có bằng tổng số lượng trong giỏ không
  const isAllSelected = allCartIds.length > 0 && selectedIds.length === allCartIds.length;

  // Tính tổng tiền những món được tick chọn
  const totalAmount = cartData.flatMap(shop => shop.items)
    .filter(item => selectedIds.includes(item.cart_id))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);


  // 3. CÁC HÀM XỬ LÝ SỰ KIỆN
  const handleSelectAll = () => {
    setSelectedIds(isAllSelected ? [] : allCartIds);
  };

  const handleSelectShop = (shopId) => {
    const shop = cartData.find(s => s.shop_id === shopId);
    const shopItemIds = shop.items.map(i => i.cart_id);
    const isShopAllSelected = shopItemIds.every(id => selectedIds.includes(id));

    if (isShopAllSelected) {
      setSelectedIds(selectedIds.filter(id => !shopItemIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...shopItemIds])));
    }
  };

  const handleSelectItem = (cartId) => {
    if (selectedIds.includes(cartId)) {
      setSelectedIds(selectedIds.filter(id => id !== cartId));
    } else {
      setSelectedIds([...selectedIds, cartId]);
    }
  };

  const handleQuantityChange = async (shopId, cartId, type) => {
    const token = localStorage.getItem('access_token');
    // Tìm item hiện tại để kiểm tra logic trước khi gọi API (tùy chọn)
    const currentShop = cartData.find(s => s.shop_id === shopId);
    const currentItem = currentShop?.items.find(i => i.cart_id === cartId);

    if (type === 'decrease' && currentItem?.quantity <= 1) return;

    try {
      const endpoint = type === 'increase' ? 'increaseitem' : 'decrease';
      const response = await axios.patch(`http://localhost:8000/cart/${endpoint}/${cartId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        window.dispatchEvent(new Event('cartUpdated'));
        const newData = cartData.map(shop => {
          if (shop.shop_id !== shopId) return shop;
          return {
            ...shop,
            items: shop.items.map(item => {
              if (item.cart_id === cartId) {
                return { ...item, quantity: type === 'increase' ? item.quantity + 1 : item.quantity - 1 };
              }
              return item;
            })
          };
        });
        setCartData(newData);
      }
    } catch (error) {
      console.error("Lỗi cập nhật số lượng:", error);
      alert(error.response?.data?.detail || "Không thể cập nhật số lượng");
    }
  };


  const handleRemove = async (cartId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

    const token = localStorage.getItem('access_token');
    try {
      await axios.delete(`http://localhost:8000/cart/remove/${cartId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Xóa sản phẩm khỏi State để UI cập nhật ngay lập tức
      const newData = cartData.map(shop => ({
        ...shop,
        items: shop.items.filter(item => item.cart_id !== cartId)
      })).filter(shop => shop.items.length > 0);
      window.dispatchEvent(new Event('cartUpdated'));
      setCartData(newData);
      // Xóa id khỏi danh sách được chọn nếu đang chọn
      setSelectedIds(selectedIds.filter(id => id !== cartId));

    } catch (error) {
      console.error("Lỗi xóa sản phẩm:", error);
      alert("Không thể xóa sản phẩm này");
    }
  };

  const handleDeleteSelected = async () => {
    // 1. Kiểm tra nếu chưa chọn gì
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn sản phẩm để xóa!");
      return;
    }

    // 2. Xác nhận
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.length} mục đã chọn?`)) {
      return;
    }

    const token = localStorage.getItem('access_token');

    try {
      // 3. Gọi API xóa hàng loạt (truyền mảng selectedIds vào body)
      const response = await axios.post(
        'http://localhost:8000/cart/remove-multiple',
        selectedIds, // Gửi trực tiếp mảng [1, 2, 3]
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        // 4. Cập nhật UI: Lọc bỏ các item có cart_id nằm trong selectedIds
        const newData = cartData.map(shop => ({
          ...shop,
          items: shop.items.filter(item => !selectedIds.includes(item.cart_id))
        })).filter(shop => shop.items.length > 0); // Xóa shop nếu không còn item nào

        setCartData(newData);
        setSelectedIds([]); // Xóa sạch danh sách tick chọn
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Lỗi xóa hàng loạt:", error);
      alert("Không thể xóa các mục đã chọn. Vui lòng thử lại.");
    }
  };
  // 4. HIỂN THỊ GIAO DIỆN
  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Đang tải giỏ hàng...</div>;

  return (
    <div className="cart-page-container">


      <div className="cart-main-content">
        {/* Header Bảng */}
        <div className="cart-header-row">
          <div className="col-checkbox"><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} /></div>
          <div className="col-product">Sản Phẩm</div>
          <div className="col-price">Đơn Giá</div>
          <div className="col-quantity">Số Lượng</div>
          <div className="col-total">Số Tiền</div>
          <div className="col-actions">Thao Tác</div>
        </div>

        {/* Gọi Component ShopGroup ra và truyền dữ liệu */}
        {cartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', background: 'white' }}>Giỏ hàng của bạn đang trống.</div>
        ) : (
          cartData.map((shop) => (
            <ShopGroup
              key={shop.shop_id}
              shop={shop}
              selectedIds={selectedIds}
              onToggleShop={handleSelectShop}
              onToggleItem={handleSelectItem}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
            />
          ))
        )}

        {/* Thanh thanh toán dưới cùng */}
        <div className="cart-sticky-bottom">
          <div className="checkout-row">
            <div className="left-actions">
              <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />
              <button className="action-btn" onClick={handleSelectAll}>Chọn Tất Cả</button>
              <button className="action-btn" onClick={handleDeleteSelected}>Xóa</button>
            </div>

            <div className="right-checkout">
              <div className="total-summary">
                <span className="label">Tổng cộng ({selectedIds.length} sản phẩm):</span>
                <span className="total-price">{totalAmount.toLocaleString('vi-VN')}₫</span>
              </div>
              <button className="btn-buy" disabled={selectedIds.length === 0 || isProcessing} onClick={handleCheckout} >
                {isProcessing ? 'Đang xử lý...' : 'Mua Hàng'}
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default Cart;