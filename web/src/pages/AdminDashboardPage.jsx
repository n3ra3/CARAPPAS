import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Car, Bell, FileText, DollarSign, Receipt, Activity, ShieldAlert } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { adminAPI } from '../services/api';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadAnalytics(period);
  }, [period]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось загрузить данные админ-панели');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (selectedPeriod) => {
    try {
      setAnalyticsLoading(true);
      const res = await adminAPI.getAnalytics(selectedPeriod);
      setAnalytics(res.data);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка админ-панели...</div>;
  }

  if (error) {
    return (
      <div>
        <h1 className="page-title">Админ-панель</h1>
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const registrations = (data?.registrationsByDay || []).map((item) => ({
    ...item,
    day: item.date?.slice(5) || item.date
  }));
  const activity = (data?.activityByDay || []).map((item) => ({
    ...item,
    day: item.date?.slice(5) || item.date
  }));
  const users = data?.recentUsers || [];
  const retention = data?.retention || { d1: { rate: 0 }, d7: { rate: 0 }, d30: { rate: 0 }, cohortSize: 0 };
  const periodReport = (analytics?.reportByDay || []).map((item) => ({
    ...item,
    day: item.date?.slice(5) || item.date
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Админ-панель</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/admin/users" className="btn btn-primary btn-sm">Управление пользователями</Link>
          <button className="btn btn-secondary btn-sm" onClick={loadDashboard}>Обновить</button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.totalUsers || 0}</div>
              <div className="stat-label">Всего пользователей</div>
            </div>
            <Users size={22} color="var(--primary)" />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.totalCars || 0}</div>
              <div className="stat-label">Автомобилей в системе</div>
            </div>
            <Car size={22} color="var(--primary)" />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.newUsers30Days || 0}</div>
              <div className="stat-label">Новых за 30 дней</div>
            </div>
            <Users size={22} color="var(--success)" />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.activeReminders || 0}</div>
              <div className="stat-label">Активных напоминаний</div>
            </div>
            <Bell size={22} color="var(--warning)" />
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.dau || 0}</div>
              <div className="stat-label">DAU</div>
            </div>
            <Activity size={22} color="var(--primary)" />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.wau || 0}</div>
              <div className="stat-label">WAU</div>
            </div>
            <Activity size={22} color="var(--success)" />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.mau || 0}</div>
              <div className="stat-label">MAU</div>
            </div>
            <Activity size={22} color="var(--warning)" />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.blockedUsers || 0}</div>
              <div className="stat-label">Заблокировано пользователей</div>
            </div>
            <ShieldAlert size={22} color="var(--danger)" />
          </div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {(stats.totalExpensesAmount || 0).toLocaleString()} MDL
              </div>
              <div className="stat-label">Сумма расходов</div>
            </div>
            <DollarSign size={22} color="var(--danger)" />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.totalExpensesRecords || 0}</div>
              <div className="stat-label">Записей расходов</div>
            </div>
            <Receipt size={22} color="var(--primary)" />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="stat-value">{stats.totalDocuments || 0}</div>
              <div className="stat-label">Документов</div>
            </div>
            <FileText size={22} color="var(--primary)" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Регистрации за 7 дней</h2>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={registrations} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Активность пользователей за 7 дней</h2>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={activity} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="var(--success)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{retention.d1?.rate || 0}%</div>
          <div className="stat-label">Retention D1</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{retention.d7?.rate || 0}%</div>
          <div className="stat-label">Retention D7</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{retention.d30?.rate || 0}%</div>
          <div className="stat-label">Retention D30</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{retention.cohortSize || 0}</div>
          <div className="stat-label">Размер когорты</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Отчет по периодам</h2>
          <select className="form-select" style={{ maxWidth: 180 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="90d">90 дней</option>
            <option value="180d">180 дней</option>
          </select>
        </div>

        {analyticsLoading ? (
          <div className="loading">Загрузка отчета...</div>
        ) : (
          <>
            <div className="grid grid-3" style={{ marginBottom: '1rem' }}>
              <div className="stat-card">
                <div className="stat-value">{analytics?.summary?.newUsers || 0}</div>
                <div className="stat-label">Новых пользователей за период</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{analytics?.summary?.averageDailyActiveUsers || 0}</div>
                <div className="stat-label">Средний DAU за период</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{analytics?.summary?.admins || 0}</div>
                <div className="stat-label">Администраторов</div>
              </div>
            </div>

            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={periodReport} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="registrations" stroke="var(--primary)" strokeWidth={2} dot={false} name="Регистрации" />
                  <Line type="monotone" dataKey="activeUsers" stroke="var(--success)" strokeWidth={2} dot={false} name="Активные пользователи" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Последние пользователи</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Имя</th>
                <th>Машин</th>
                <th>Дата регистрации</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.email}</td>
                  <td>{user.name || '-'}</td>
                  <td>{user.cars_count}</td>
                  <td>{new Date(user.created_at).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && <div className="empty-state">Пользователи не найдены</div>}
        </div>
      </div>
    </div>
  );
}
