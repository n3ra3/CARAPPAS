import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Car, Bell, LogOut, FileText, Fuel } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <NavLink to="/" className="logo">АвтоПомощник</NavLink>
        
        <nav>
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Home size={20} /> Главная
          </NavLink>
          <NavLink to="/garage" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Car size={20} /> Гараж
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={20} /> Документы
          </NavLink>
          <NavLink to="/reminders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Bell size={20} /> Напоминания
          </NavLink>
          <NavLink to="/fuel-map" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Fuel size={20} /> Заправки
          </NavLink>
        </nav>

        <div className="user-menu">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="user-name">{user?.name || 'Пользователь'}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button className="nav-link" onClick={logout} style={{ width: '100%' }}>
            <LogOut size={20} /> Выйти
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
