import React, { useState, useEffect } from 'react';
import { userService } from '../../services/customer'; 
import axios from 'axios';
import './style.scss';

// --- COMPONENT CHỌN ĐỊA CHỈ ---
function AddressSelector({ currentMapId, onDistrictSelect }) {
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  // Gom chung vào 1 luồng khởi tạo duy nhất để tránh race condition
  useEffect(() => {
    const initLocationData = async () => {
      try {
        // 1. Luôn lấy danh sách Tỉnh/Thành (Level 1) trước tiên
        const cityRes = await axios.get('http://localhost:8000/map/get-locations');
        setCities(cityRes.data.data || []);

        // 2. Nếu Customer ĐÃ CÓ map_id, tiến hành load data tương ứng
        if (currentMapId) {
          // Gọi API để tìm xem Quận này thuộc Tỉnh/Thành nào
          const detailRes = await axios.get(`http://localhost:8000/map/get-location/${currentMapId}`);
          const locationDetail = detailRes.data.data;

          if (locationDetail && locationDetail.parent_id) {
            const cityId = locationDetail.parent_id;
            setSelectedCity(cityId);

            // Lấy danh sách Quận/Huyện thuộc Tỉnh/Thành đó
            const distRes = await axios.get(`http://localhost:8000/map/get-locations?parent_id=${cityId}`);
            setDistricts(distRes.data.data || []);
            
            // Set giá trị cho thẻ select Quận/Huyện
            setSelectedDistrict(currentMapId);
          }
        }
      } catch (error) {
        console.error("Lỗi khi khởi tạo dữ liệu địa chỉ:", error);
      }
    };

    initLocationData();
  }, [currentMapId]); // Chỉ chạy lại nếu currentMapId thay đổi từ cha truyền xuống

  // 3. Xử lý khi Customer TỰ CHỌN/ĐỔI Tỉnh/Thành mới
  const handleCityChange = async (e) => {
    const cityId = e.target.value;
    setSelectedCity(cityId);
    
    // Reset lại Quận/Huyện vì Tỉnh/Thành đã thay đổi
    setSelectedDistrict(''); 
    onDistrictSelect(null);  
    
    if (cityId) {
      try {
        // Lấy danh sách Quận/Huyện mới
        const res = await axios.get(`http://localhost:8000/map/get-locations?parent_id=${cityId}`);
        setDistricts(res.data.data || []);
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
    // Trả data về cho Component cha (Profile)
    onDistrictSelect(districtId ? parseInt(districtId) : null); 
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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await userService.getProfile();
        if (res.status === 'success') {
          const data = res.data.data; 
          setFormData({
            name: data.name || '',
            number: data.number || '', 
            map_id: data.map_id || null, // Nếu null, AddressSelector sẽ tự hiểu là user mới
            address_detail : data.address_detail || '',
            note : data.note || '' 
          });
          setDisplayAddress(data.full_address_string || "");
        }
      } catch (err) { 
        console.error("Lỗi load profile:", err); 
      } finally {
        // Dừng loading -> AddressSelector mới được render và chạy API map
        setLoading(false); 
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await userService.updateProfile(formData);
      if (res.status === 'success') {
        alert("Cập nhật thông tin thành công!");
        if (res.data?.data?.full_address_string) {
          setDisplayAddress(res.data.data.full_address_string);
        } else {
          window.location.reload(); 
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
      <p>Quản lý thông tin hồ sơ và địa chỉ</p>
      
      {displayAddress && (
        <div style={{ padding: '10px', backgroundColor: '#eef2ff', marginBottom: '20px', borderRadius: '4px' }}>
          <strong>Địa chỉ đang lưu:</strong> {displayAddress}
        </div>
      )}

      <hr />
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Họ và tên</label>
          <input name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Số điện thoại</label>
          <input name="number" value={formData.number} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Chọn Khu vực</label>
          <AddressSelector 
             currentMapId={formData.map_id} 
             onDistrictSelect={(districtId) => setFormData({...formData, map_id: districtId})} 
          />
        </div>

        <div className="form-group">
          <label>Số nhà / Tên đường</label>
          <input 
            name="address_detail" 
            value={formData.address_detail} 
            onChange={handleChange} 
            placeholder="Ví dụ: 123/45A Lê Lợi" 
          />
        </div>

        <div className="form-group">
          <label>Ghi chú (NOTE)</label>
          <textarea 
            name="note" 
            value={formData.note} 
            onChange={handleChange} 
            placeholder="Ví dụ: Giao vào lúc 12h trưa..." 
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