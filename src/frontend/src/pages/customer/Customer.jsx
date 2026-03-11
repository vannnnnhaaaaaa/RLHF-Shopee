import React, { useState, useEffect } from 'react';
import { userService } from '../../services/customer'; // Đường dẫn tùy thuộc cấu trúc của bạn
import axios from 'axios';
import './style.scss';

// --- COMPONENT CHỌN ĐỊA CHỈ ---
function AddressSelector({ currentMapId, onDistrictSelect }) {
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(currentMapId || '');

  // Lấy danh sách thành phố khi mở form
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await axios.get('http://localhost:8000/map/get-locations');
        // Lưu ý: API FastAPI trả về { status: "success", data: [...] } nên phải là res.data.data
        setCities(res.data.data); 
      } catch (err) {
        console.error("Lỗi lấy danh sách thành phố:", err);
      }
    };
    fetchCities();
  }, []);

  const handleCityChange = async (e) => {
    const cityId = e.target.value;
    setSelectedCity(cityId);
    setSelectedDistrict(''); // Reset quận
    onDistrictSelect(null);  // Reset map_id ở form ngoài
    
    if (cityId) {
      try {
        const res = await axios.get(`http://localhost:8000/map/get-locations?parent_id=${cityId}`);
        setDistricts(res.data.data);
      } catch (err) {
        console.error("Lỗi lấy danh sách quận:", err);
      }
    } else {
      setDistricts([]);
    }
  };

  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    setSelectedDistrict(districtId);
    // Truyền map_id (ID của Quận) ngược lại cho Form Profile ở ngoài
    onDistrictSelect(parseInt(districtId)); 
  };

  return (
    <div className="address-selectors" style={{ display: 'flex', gap: '10px', flex: 1 }}>
      <select value={selectedCity} onChange={handleCityChange} style={{ flex: 1, padding: '10px', border: '1px solid #ddd' }}>
        <option value="">-- Chọn Tỉnh/Thành --</option>
        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      
      <select value={selectedDistrict} onChange={handleDistrictChange} disabled={!selectedCity} style={{ flex: 1, padding: '10px', border: '1px solid #ddd' }}>
        <option value="">-- Chọn Quận/Huyện --</option>
        {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </div>
  );
}

// --- FORM PROFILE CHÍNH ---
function Profile() {
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    map_id: null,
    address_detail: '',
    note: ''
  });
  
  const [displayAddress, setDisplayAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load thông tin profile khi vào trang
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await userService.getProfile();
        if (res.status === 'success') {
          const data = res.data.data; // Dữ liệu customer nằm trong res.data.data
          setFormData({
            name: data.name || '',
            phone_number: data.number || '',
            map_id: data.map_id || null,
            address_detail : data.address_detail || '',
            note : data.address_detail || ''
          });
          setDisplayAddress(data.full_address_string || "");
        }
      } catch (err) { 
        console.error("Lỗi load profile:", err); 
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Xử lý thay đổi các ô input thường
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Xử lý lưu thông tin
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await userService.updateProfile(formData);
      if (res.status === 'success') {
        alert("Cập nhật thông tin thành công!");
        // Cập nhật lại chuỗi địa chỉ hiển thị nếu có thay đổi
        if (res.data?.data?.full_address_string) {
          setDisplayAddress(res.data.data.full_address_string);
        } else {
          window.location.reload(); // Cách nhanh nhất để load lại dữ liệu hiển thị chuẩn
        }
      }
    } catch (err) {
      alert("Cập nhật thất bại: " + (err.response?.data?.detail || "Lỗi server"));
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Đang tải...</div>;

  return (
    <div className="profile-container">
      <h2>Hồ Sơ Của Tôi</h2>
      <p>Quản lý thông tin hồ sơ và địa chỉ nhận hàng</p>
      <hr />
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Họ và tên</label>
          <input name="name" value={formData.full_name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Số điện thoại</label>
          <input name="number" value={formData.phone_number} onChange={handleChange} required />
        </div>

        
        <div className="form-group">
          <label>Chọn lại Khu vực</label>
          <AddressSelector 
             currentMapId={formData.map_id} 
             onDistrictSelect={(districtId) => setFormData({...formData, map_id: districtId})} 
          />
        </div>

        <div className="form-group">
          <label>Số nhà / Tên đường</label>
          <input 
            name="address_detail" 
            value={formData.number} 
            onChange={handleChange} 
            placeholder="Ví dụ: 123/45A Lê Lợi" 
          />
        </div>

        <div className="form-group">
          <label>Ghi chú NOTE </label>
          <textarea 
            name="note" 
            value={formData.address_detail} 
            onChange={handleChange} 
            placeholder="Ví dụ: Giao vào lúc 12h trưa , thứ 2 tới thứ 6 ... " 
          />
        </div>
        
        <button type="submit" className="btn-save" disabled={isUpdating}>
          {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}

export default Profile;