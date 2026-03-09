import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import './style.scss';
import Footer from "../../../components/Footer";

const BecomeSeller = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        shopName: '',
        phoneNumber: '',
        pickupAddress: '',
        description: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Giả lập gọi API tạo thông tin Seller
            // const response = await createSellerApi(formData);
            
            console.log("Dữ liệu đăng ký shop:", formData);
            
            // Giả lập thời gian chờ API
            setTimeout(() => {
                alert("Đăng ký tài khoản người bán thành công! Chào mừng bạn đến với Kênh Người Bán.");
                // Cập nhật lại localStorage nếu cần (ví dụ: set lại flag has_shop = true)
                navigate('/seller/dashboard');
            }, 1500);

        } catch (error) {
            console.error("Lỗi khi đăng ký:", error);
            alert("Có lỗi xảy ra, vui lòng thử lại sau!");
            setIsLoading(false);
        }
    };

    return (
        <div className="become-seller-wrapper">
            <div className="become-seller-container">
                <div className="registration-header">
                    <h2>Đăng Ký Trở Thành Người Bán</h2>
                    <p>Vui lòng cung cấp thông tin để thiết lập gian hàng của bạn</p>
                </div>

                <div className="registration-card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Tên Shop <span>*</span></label>
                            <input
                                type="text"
                                name="shopName"
                                value={formData.shopName}
                                onChange={handleChange}
                                placeholder="Nhập tên gian hàng của bạn (ví dụ: Shop Quần Áo Đẹp)"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Số Điện Thoại Liên Hệ <span>*</span></label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                placeholder="Nhập số điện thoại"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Địa Chỉ Lấy Hàng <span>*</span></label>
                            <textarea
                                name="pickupAddress"
                                value={formData.pickupAddress}
                                onChange={handleChange}
                                placeholder="Nhập địa chỉ chi tiết để đơn vị vận chuyển đến lấy hàng"
                                rows="3"
                                required
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label>Mô tả Shop</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Giới thiệu ngắn gọn về các sản phẩm bạn sẽ bán (không bắt buộc)"
                                rows="4"
                            ></textarea>
                        </div>

                        <div className="terms-checkbox">
                            <input type="checkbox" id="terms" required />
                            <label htmlFor="terms">
                                Tôi đồng ý với <a href="/terms">Điều khoản dịch vụ</a> và <a href="/privacy">Chính sách bảo mật</a> dành cho Người Bán.
                            </label>
                        </div>

                        <button 
                            type="submit" 
                            className="submit-btn" 
                            disabled={isLoading}
                        >
                            {isLoading ? "Đang xử lý..." : "Lưu & Bắt đầu bán hàng"}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default BecomeSeller;