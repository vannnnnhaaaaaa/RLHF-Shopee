import { Route, BrowserRouter, Routes } from 'react-router-dom'

import Signup from './pages/signup'
import LoginPage from './pages/login'
import HomePage from './pages/shopee/HomePage/Shopee'
import BecomeSeller from './pages/Seller/become_seller'
import SellerDashboard from './pages/Seller/dashboard_seller'
import AddProduct from './pages/Seller/add_product'
import ManageProducts from './pages/Seller/manage_products'
import ManageOrders from './pages/Seller/manage_orders'
import CancelOrderManage from './pages/Seller/cacel_order_manage/CancelOrderManage'
import ReturnManage from './pages/Seller/manage_return'
import HomeDashboard from './pages/Seller/home_page'
import AdminDashboard from './pages/admin/RLHF/adminrRLHF'
import DetailProduct from './pages/shopee/DetailProduct'
import Cart from './pages/shopee/Cart'
import Profile from './pages/customer'
import UserAccount from './pages/shopee/Profile/UserAccount'
import CustomerLayout from './pages/shopee/CustomerLayout/CustomerLayout'
import Purchase from './pages/shopee/Purchase/Purchase'
import NotificationPage from './components/NotificationPage'
import ShopeeRLHFRoutes from './pages/shope_RLHF'
import Checkout from './pages/shopee/Checkout'
import VoucherManagement from './pages/Seller/manage_voucher'
function AppContent() {
  return (
    <>
      <Routes>
       
        <Route path='/customer/signup' element={<Signup />} />
        <Route path='/customer/login' element={<LoginPage />} />
        <Route path='/seller-login' element={<LoginPage />} />
        <Route path='/become-seller' element={<BecomeSeller />} />
        <Route path='/adminDashboard_RLHF' element={<AdminDashboard />} />
        
        {/* Shopee RLHF Routes */}
        <Route path='/shope_rlhf/*' element={<ShopeeRLHFRoutes />} />

        {/* Product detail route at root level */}
        <Route path='/product/:id' element={<DetailProduct />} />

    
        <Route path='/customer' element={<CustomerLayout />}>
          <Route index element={<HomePage />} />

          <Route path='account' element={<UserAccount />}>
            <Route index element={<Profile />} />
            <Route path='purchase' element= {<Purchase/>} />
            <Route path='notifications' element={<NotificationPage />} /> 
          </Route>
          <Route path='checkout' element= {<Checkout />} />
          <Route path='product/:id' element={<DetailProduct />} />
          <Route path='cartitem' element={<Cart />} />
        </Route>

        {/* KHU VỰC NGƯỜI BÁN (Giữ nguyên vì bạn đã code chuẩn rồi) */}
        <Route path="/seller-dashboard" element={<SellerDashboard />}>
          <Route index element={<HomeDashboard />} />
          <Route path="orders/cancellations" element={<CancelOrderManage />} />
          <Route path="products/add" element={<AddProduct />} />
          <Route path="products/manage" element={<ManageProducts />} />
          <Route path="products/manage/products/edit/:id" element={<AddProduct />} />
          <Route path="orders/manage" element={<ManageOrders />} />
          <Route path="orders/managereturn" element={<ReturnManage />} />
          <Route path="voucher/manage" element={<VoucherManagement />} />
        </Route>

      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App