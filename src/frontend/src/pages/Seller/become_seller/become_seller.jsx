import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './style.scss'; // Dùng chung hoặc tạo riêng BecomeSeller.scss
import Footer from "../../../components/Footer"; // Điều chỉnh đường dẫn theo dự án của bạn

import { registerSellerApi } from "../../../services/sellerApi"

const BecomeSeller = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    
    // Khởi tạo state với đầy đủ các trường thông tin
    const [formData, setFormData] = useState({
        shopName: '',
        phoneNumber: '',
        email: '',
        city: '',
        detailedAddress: '',
        cccd: '',
        bankName: '',
        bankAccount: '',
        bankHolder: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. "Dịch" dữ liệu sang chuẩn snake_case của Backend
    const payload = {
        shop_name: formData.shopName,
        phone_number: formData.phoneNumber,
        email: formData.email,
        city: formData.city,
        detailed_address: formData.detailedAddress,
        cccd_number: formData.cccd, // Chú ý map đúng vào cccd_number
        bank_name: formData.bankName,
        bank_account: formData.bankAccount,
        bank_holder: formData.bankHolder
    };

    try {
        const data = await registerSellerApi(payload)

        
        alert (' bạn đã đăng ký thành công shope '+ data.shop_name)
        navigate('/seller-dashboard')

    } catch (error) {
        console.error("Lỗi:", error);
    }
}
    return (
        <div className="become-seller-wrapper">
            <div className="become-seller-container">
                <div className="registration-header">
                    <h2>Đăng Ký Trở Thành Người Bán</h2>
                    <p>Hoàn tất thông tin dưới đây để mở gian hàng và bắt đầu kinh doanh</p>
                </div>

                <div className="registration-card">
                    <form onSubmit={handleSubmit}>
                        
                        {/* --- 1. THÔNG TIN CƠ BẢN --- */}
                        <div className="form-section">
                            <h3>1. Thông tin cơ bản</h3>
                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>Tên Shop <span>*</span></label>
                                    <input type="text" name="shopName" value={formData.shopName} onChange={handleChange} placeholder="Ví dụ: TechStore VN" required />
                                    <span className="hint">Tên này sẽ hiển thị trên trang chủ gian hàng của bạn.</span>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Số điện thoại liên hệ <span>*</span></label>
                                    <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Nhập số điện thoại" required />
                                </div>
                                <div className="form-group">
                                    <label>Email <span>*</span></label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Nhập email để nhận thông báo" required />
                                </div>
                            </div>
                        </div>

                        {/* --- 2. ĐỊA CHỈ KHO HÀNG --- */}
                        <div className="form-section">
                            <h3>2. Địa chỉ lấy/trả hàng</h3>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tỉnh / Thành phố <span>*</span></label>
                                    <select name="city" value={formData.city} onChange={handleChange} required>
                                        <option value="" disabled>-- Chọn Tỉnh/Thành phố --</option>
                                        <option value="Hà Nội">Hà Nội</option>
                                        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                                        <option value="Đà Nẵng">Đà Nẵng</option>
                                        <option value="Hải Phòng">Hải Phòng</option>
                                        <option value="Cần Thơ">Cần Thơ</option>
                                        <option value="Khác">Tỉnh thành khác...</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>Địa chỉ chi tiết (Số nhà, Tên đường, Phường/Xã) <span>*</span></label>
                                    <textarea name="detailedAddress" value={formData.detailedAddress} onChange={handleChange} rows="2" placeholder="Ví dụ: Số 123, Đường Lê Lợi, Phường Bến Nghé, Quận 1" required ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* --- 3. ĐỊNH DANH --- */}
                        <div className="form-section">
                            <h3>3. Thông tin định danh</h3>
                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>Số Căn Cước Công Dân (CCCD) <span>*</span></label>
                                    <input type="text" name="cccd" value={formData.cccd} onChange={handleChange} placeholder="Nhập 12 số CCCD của bạn" maxLength="12" pattern="\d{12}" title="CCCD phải gồm 12 chữ số" required />
                                </div>
                            </div>
                        </div>

                        {/* --- 4. THÔNG TIN NGÂN HÀNG --- */}
                        <div className="form-section">
                            <h3>4. Thông tin nhận tiền</h3>
                            <p className="section-desc">Tiền bán hàng sẽ được chuyển vào tài khoản này của bạn.</p>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Ngân hàng <span>*</span></label>
                                    <select name="bankName" value={formData.bankName} onChange={handleChange} required>
                                        <option value="" disabled>-- Chọn Ngân hàng --</option>
                                        <option value="Vietcombank">Vietcombank</option>
                                        <option value="MB Bank">MB Bank (Quân Đội)</option>
                                        <option value="Techcombank">Techcombank</option>
                                        <option value="VietinBank">VietinBank</option>
                                        <option value="BIDV">BIDV</option>
                                        <option value="ACB">ACB</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Số tài khoản <span>*</span></label>
                                    <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange} placeholder="Nhập số tài khoản" required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group full-width">
                                    <label>Tên chủ tài khoản (Viết hoa không dấu) <span>*</span></label>
                                    <input type="text" name="bankHolder" value={formData.bankHolder} onChange={handleChange} placeholder="Ví dụ: NGUYEN VAN A" required />
                                    <span className="hint">Tên chủ tài khoản phải trùng khớp với tên trên CCCD để tránh lỗi khi rút tiền.</span>
                                </div>
                            </div>
                        </div>

                        {/* --- ĐIỀU KHOẢN & SUBMIT --- */}
                        <div className="terms-checkbox">
                            <input type="checkbox" id="terms" required />
                            <label htmlFor="terms">
                                Tôi xác nhận các thông tin trên là chính xác và đồng ý với <a href="/terms">Điều khoản dịch vụ</a> của Sàn thương mại điện tử.
                            </label>
                        </div>

                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            {isLoading ? <span className="spinner">Đang xử lý...</span> : "Đăng ký & Bắt đầu kinh doanh"}
                        </button>   
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default BecomeSeller;