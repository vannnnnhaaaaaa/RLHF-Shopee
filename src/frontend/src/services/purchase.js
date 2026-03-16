// Dữ liệu giả lập (Mock Data) lấy từ thiết kế của bạn
const MOCK_ORDERS = [
  {
    id: '1',
    shopName: 'Trang Vani - Hàng Nội Địa',
    isFavorite: true,
    statusText: 'Giao hàng thành công',
    status: 'COMPLETED',
    productName: '[DATE MỚI] Bánh Que Socola TICKY Thái Lan',
    variation: 'Gấu Dâu, 1 HỘP',
    quantity: 2,
    price: 8500,
    totalAmount: 7000,
  },
  {
    id: '2',
    shopName: 'ICON-M',
    isFavorite: true,
    statusText: '',
    status: 'CANCELLED',
    productName: 'ICON Bàn sách gấp gọn mini Bàn làm việc cho máy tính xách tay, thích hợp cho sinh viên và người đi làm',
    variation: 'trắng-Nâng cấp',
    quantity: 1,
    originalPrice: 250000,
    price: 211758,
    totalAmount: 211758,
  }
];

export const purchaseApi = {
  // Hàm giả lập gọi API lấy danh sách đơn hàng
  getOrders: async (status = 'ALL', searchQuery = '') => {
    return new Promise((resolve) => {
      // Giả lập độ trễ mạng (Network delay) 0.5 giây
      setTimeout(() => {
        let filteredOrders = MOCK_ORDERS;
        
        // Giả lập logic lọc theo trạng thái trên backend
        if (status !== 'ALL') {
          filteredOrders = filteredOrders.filter(order => order.status === status);
        }
        
        // Trả về dữ liệu
        resolve(filteredOrders);
      }, 500); 
    });
  }
};