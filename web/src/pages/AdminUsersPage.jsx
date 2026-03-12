import { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers(1);
  }, [role, status]);

  const loadUsers = async (page = pagination.page) => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: PAGE_SIZE,
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
        search: search.trim() || undefined
      };
      const res = await adminAPI.getUsers(params);
      const payloadUsers = Array.isArray(res.data?.users) ? res.data.users : [];
      const payloadPagination = res.data?.pagination || { page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE };
      setUsers(payloadUsers);
      setPagination(payloadPagination);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Доступ запрещен: у вашего аккаунта нет прав администратора');
      } else {
        setError(err.response?.data?.error || 'Не удалось загрузить пользователей');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers(1);
  };

  const handleToggleBlock = async (user) => {
    try {
      await adminAPI.setUserBlocked(user.id, !user.is_blocked);
      await loadUsers(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось изменить статус блокировки');
    }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      await adminAPI.setUserRole(user.id, newRole);
      await loadUsers(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось изменить роль');
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(`Удалить пользователя ${user.email}? Это действие необратимо.`);
    if (!confirmed) {
      return;
    }

    try {
      await adminAPI.deleteUser(user.id);
      const nextPage = users.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await loadUsers(nextPage);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось удалить пользователя');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Управление пользователями</h1>
        <button className="btn btn-secondary btn-sm" onClick={() => loadUsers(pagination.page)}>Обновить</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <form className="grid grid-4" onSubmit={handleSearchSubmit}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Поиск</label>
            <input
              className="form-input"
              placeholder="Email или имя"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Роль</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="all">Все роли</option>
              <option value="admin">Только админы</option>
              <option value="user">Только пользователи</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Статус</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Применить</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Пользователи ({pagination.total || 0})</h2>
        </div>

        {loading ? (
          <div className="loading">Загрузка пользователей...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Машин</th>
                  <th>Последний вход</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                    <td>{user.name || '-'}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-success'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.is_blocked ? 'badge-danger' : 'badge-success'}`}>
                        {user.is_blocked ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td>{user.cars_count}</td>
                    <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString('ru-RU') : '-'}</td>
                    <td>{new Date(user.created_at).toLocaleString('ru-RU')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRoleChange(user, user.role === 'admin' ? 'user' : 'admin')}
                        >
                          {user.role === 'admin' ? 'Сделать user' : 'Сделать admin'}
                        </button>
                        <button
                          className={`btn btn-sm ${user.is_blocked ? 'btn-secondary' : 'btn-danger'}`}
                          onClick={() => handleToggleBlock(user)}
                        >
                          {user.is_blocked ? 'Разблокировать' : 'Блокировать'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user)}>
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && <div className="empty-state">По текущим фильтрам пользователи не найдены</div>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Страница {pagination.page} из {pagination.totalPages}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => loadUsers(pagination.page - 1)}
            >
              Назад
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => loadUsers(pagination.page + 1)}
            >
              Вперед
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
