import React from 'react';
import './style.scss';

const Footer = () => {
  return (
    <footer className="shopee-footer">
      <div className="container">
        {/* Phần trên: Các cột thông tin */}
        <div className="footer-top">
          <div className="footer-col">
            <h3 className="footer-title">DỊCH VỤ KHÁCH HÀNG</h3>
            <ul className="footer-list">
              <li><a href="#">Trung Tâm Trợ Giúp Shopee</a></li>
              <li><a href="#">Shopee Blog</a></li>
              <li><a href="#">Shopee Mall</a></li>
              <li><a href="#">Hướng Dẫn Mua Hàng/Đặt Hàng</a></li>
              <li><a href="#">Hướng Dẫn Bán Hàng</a></li>
              <li><a href="#">Ví ShopeePay</a></li>
              <li><a href="#">Shopee Xu</a></li>
              <li><a href="#">Đơn Hàng</a></li>
              <li><a href="#">Trả Hàng/Hoàn Tiền</a></li>
              <li><a href="#">Liên Hệ Shopee</a></li>
              <li><a href="#">Chính Sách Bảo Hành</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">SHOPEE VIỆT NAM</h3>
            <ul className="footer-list">
              <li><a href="#">Về Shopee</a></li>
              <li><a href="#">Tuyển Dụng</a></li>
              <li><a href="#">Điều Khoản Shopee</a></li>
              <li><a href="#">Chính Sách Bảo Mật</a></li>
              <li><a href="#">Shopee Mall</a></li>
              <li><a href="#">Kênh Người Bán</a></li>
              <li><a href="#">Flash Sale</a></li>
              <li><a href="#">Tiếp Thị Liên Kết</a></li>
              <li><a href="#">Liên Hệ Truyền Thông</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">THANH TOÁN</h3>
            <div className="logo-grid">
              <div className="logo-item"><img src="" alt="Visa" /></div>
              <div className="logo-item"><img src="" alt="Mastercard" /></div>
              <div className="logo-item"><img src="" alt="JCB" /></div>
              <div className="logo-item"><img src="" alt="Amex" /></div>
              <div className="logo-item"><img src="" alt="COD" /></div>
              <div className="logo-item"><img src="" alt="Trả góp" /></div>
              <div className="logo-item"><img src="" alt="ShopeePay" /></div>
              <div className="logo-item"><img src="" alt="SPayLater" /></div>
            </div>

            <h3 className="footer-title mt-20">ĐƠN VỊ VẬN CHUYỂN</h3>
            <div className="logo-grid">
              <div className="logo-item"><img src="" alt="SPX" /></div>
              <div className="logo-item"><img src="" alt="Giao Hàng Nhanh" /></div>
              <div className="logo-item"><img src="" alt="Viettel Post" /></div>
              <div className="logo-item"><img src="" alt="Vietnam Post" /></div>
              <div className="logo-item"><img src="" alt="J&T Express" /></div>
              <div className="logo-item"><img src="" alt="GrabExpress" /></div>
              <div className="logo-item"><img src="" alt="Ninja Van" /></div>
              <div className="logo-item"><img src="" alt="Be" /></div>
              <div className="logo-item"><img src="" alt="Ahamove" /></div>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">THEO DÕI SHOPEE</h3>
            <ul className="footer-list">
              <li><a href="#"><img src="" alt="FB" className="icon"/> Facebook</a></li>
              <li><a href="#"><img src="" alt="IG" className="icon"/> Instagram</a></li>
              <li><a href="#"><img src="" alt="IN" className="icon"/> LinkedIn</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-title">TẢI ỨNG DỤNG SHOPEE</h3>
            <div className="download-app">
              <div className="qr-code">
                <img src="" alt="QR Code" />
              </div>
              <div className="app-stores">
                <img src="" alt="App Store" />
                <img src="" alt="Google Play" />
                <img src="" alt="AppGallery" />
              </div>
            </div>
          </div>
        </div>

        {/* Phần giữa: Quốc gia và khu vực */}
        <div className="footer-middle">
          <div className="copyright">
            © 2026 Shopee. Tất cả các quyền được bảo lưu.
          </div>
          <div className="country-list">
            Quốc gia & Khu vực: 
            <a href="#">Argentina</a> | <a href="#">Singapore</a> | <a href="#">Indonesia</a> | <a href="#">Thái Lan</a> | <a href="#">Malaysia</a> | <a href="#">Việt Nam</a> | <a href="#">Philippines</a> | <a href="#">Brazil</a> | <a href="#">México</a> | <a href="#">Đài Loan</a>
          </div>
        </div>
      </div>

      {/* Phần dưới cùng: Thông tin công ty & Chính sách */}
      <div className="footer-bottom">
        <div className="container">
          <div className="policy-links">
            <a href="#">CHÍNH SÁCH BẢO MẬT</a>
            <a href="#">QUY CHẾ HOẠT ĐỘNG</a>
            <a href="#">CHÍNH SÁCH VẬN CHUYỂN</a>
            <a href="#">CHÍNH SÁCH TRẢ HÀNG VÀ HOÀN TIỀN</a>
          </div>

          <div className="cert-logos">
            <img src="" alt="Đã đăng ký Bộ Công Thương" />
            <img src="" alt="Đã thông báo Bộ Công Thương" />
            <img src="" alt="Chống hàng giả" />
          </div>

          <div className="company-info">
            <p className="company-name">Công ty TNHH Shopee</p>
            <p>Địa chỉ: Tầng 4-5-6, Tòa nhà Capital Place, số 29 đường Liễu Giai, Phường Ngọc Hà, Quận Ba Đình, Thành phố Hà Nội, Việt Nam</p>
            <p>Chăm sóc khách hàng: Gọi tổng đài Shopee (miễn phí) hoặc Trò chuyện với Shopee ngay trên Trung tâm trợ giúp</p>
            <p>Chịu Trách Nhiệm Quản Lý Nội Dung: Nguyễn Đức Trí</p>
            <p>Mã số doanh nghiệp: 0106773786 do Sở Kế hoạch & Đầu tư TP Hà Nội cấp lần đầu ngày 10/02/2015</p>
            <p>© 2015 - Bản quyền thuộc về Công ty TNHH Shopee</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;