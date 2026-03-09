import { Route, BrowserRouter, Routes } from 'react-router-dom'

import Signup from './pages/signup'
import LoginPage from './pages/login'
import Shopee from './pages/shopee'
import BecomeSeller from './pages/Seller/become_seller'
import SellerDashboard from './pages/Seller/dashboard_seller'
import AddProduct from './pages/Seller/add_product'
import ManageProducts from './pages/Seller/manage_products'
import ManageOrders from './pages/Seller/manage_orders'
import CancelOrderManage from './pages/Seller/cacel_order_manage/CancelOrderManage'
import ReturnManage from './pages/Seller/manage_return'
import HomeDashboard from './pages/Seller/home_page'
import AdminDashboard from './pages/admin/RLHF/adminrRLHF'
function App() {


  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/signup' element={<Signup />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/home' element={<Shopee />} />
          <Route path='/seller-login' element={<LoginPage />} />
          <Route path='/become-seller' element={<BecomeSeller />} />
          <Route path='/adminDashboard_RLHF' element={<AdminDashboard />} />
     
          <Route path="/seller-dashboard" element={<SellerDashboard />}>
            <Route index element={<HomeDashboard />} />
            <Route path="orders/cancellations" element={<CancelOrderManage />} />
            <Route path="products/add" element={<AddProduct />} />
            <Route path="products/manage" element={<ManageProducts />} />
            <Route path="orders/manage" element={<ManageOrders />} />
            <Route path="orders/managereturn" element={<ReturnManage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
