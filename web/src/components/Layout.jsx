import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Home, Car, Bell, LogOut, FileText, Fuel, Shield, Users, Moon, Sun } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="layout">
      <aside className="sidebar reveal">
        <NavLink to="/" className="logo tap">CarApp</NavLink>
        
        <nav>
          <NavLink to="/" end className={({ isActive }) => `nav-link tap ${isActive ? 'active' : ''}`}>
            <Home size={20} /> Главная
          </NavLink>
          <NavLink to="/garage" className={({ isActive }) => `nav-link tap ${isActive ? 'active' : ''}`}>
            <Car size={20} /> Гараж
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => `nav-link tap ${isActive ? 'active' : ''}`}>
            <FileText size={20} /> Документы
          </NavLink>
          <NavLink to="/reminders" className={({ isActive }) => `nav-link tap ${isActive ? 'active' : ''}`}>
            <Bell size={20} /> Напоминания
          </NavLink>
          <NavLink to="/fuel-map" className={({ isActive }) => `nav-link tap ${isActive ? 'active' : ''}`}>
            <Fuel size={20} /> Заправки
          </NavLink>
          {user?.isAdmin && (
            <>
              <NavLink to="/admin" className={({ isActive }) => `nav-link tap ${isActive ? 'active' : ''}`}>
                <Shield size={20} /> Админ-панель
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `nav-link tap ${isActive ? 'active' : ''}`}>
                <Users size={20} /> Пользователи
              </NavLink>
            </>
          )}
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
          <button className="nav-link tap" onClick={logout} style={{ width: '100%' }}>
            <LogOut size={20} /> Выйти
          </button>
          <button className="nav-link theme-toggle-btn tap" onClick={toggleTheme} style={{ width: '100%' }}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            {isDark ? 'Светлая тема' : 'Темная тема'}
          </button>
        </div>
      </aside>

      <main className="main-content reveal reveal-delay-1">
        <Outlet />
      </main>
    </div>
  );
}
