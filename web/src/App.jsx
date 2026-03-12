import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GaragePage from './pages/GaragePage';
import CarDetailPage from './pages/CarDetailPage';
import ServicePage from './pages/ServicePage';
import ExpensesPage from './pages/ExpensesPage';
import RemindersPage from './pages/RemindersPage';
import DocumentsPage from './pages/DocumentsPage';
import FuelMapPage from './pages/FuelMapPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }
  
  return user ? <Navigate to="/" /> : children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return user.isAdmin ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute><RegisterPage /></PublicRoute>
      } />
      
      <Route path="/" element={
        <PrivateRoute><Layout /></PrivateRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="garage" element={<GaragePage />} />
        <Route path="car/:id" element={<CarDetailPage />} />
        <Route path="car/:id/service" element={<ServicePage />} />
        <Route path="car/:id/expenses" element={<ExpensesPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="fuel-map" element={<FuelMapPage />} />
        <Route path="admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      </Route>
    </Routes>
  );
}
