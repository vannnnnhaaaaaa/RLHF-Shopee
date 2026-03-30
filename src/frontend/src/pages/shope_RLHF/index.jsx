import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './login';
import Register from './Register';
import MemberDashboard from './memberdashboard';
import AdminDashboard from './AdminDashboard';
import Work from './work';

export default function RLHFRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<Register />} />
      <Route path="member-dashboard" element={<MemberDashboard />} />
      <Route path="admin-dashboard" element={<AdminDashboard />} />
      <Route path="work/:id" element={<Work />} />
      <Route path="" element={<Navigate to="login" replace />} />
    </Routes>
  );
}
