import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { carsAPI, serviceAPI, expensesAPI, remindersAPI } from '../services/api';
import { Wrench, Fuel, Bell, ArrowLeft, Edit, Trash2, DollarSign, TrendingUp, Plus } from 'lucide-react';

export default function CarDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentService, setRecentService] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMileage, setEditMileage] = useState(false);
  const [newMileage, setNewMileage] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [carRes, statsRes, serviceRes, remindersRes] = await Promise.all([
        carsAPI.getById(id),
        expensesAPI.getStats(id),
        serviceAPI.getByCar(id),
        remindersAPI.getByCar(id)
      ]);
      setCar(carRes.data.car);
      setStats(statsRes.data.stats);
      setRecentService(serviceRes.data.records.slice(0, 5));
      setReminders(remindersRes.data.reminders.filter(r => !r.is_completed).slice(0, 5));
      setNewMileage(carRes.data.car.mileage);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMileageUpdate = async () => {
    try {
      await carsAPI.updateMileage(id, parseInt(newMileage));
      setCar({ ...car, mileage: parseInt(newMileage) });
      setEditMileage(false);
    } catch (error) {
      alert('Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить автомобиль и все связанные данные?')) return;
    try {
      await carsAPI.delete(id);
      navigate('/garage');
    } catch (error) {
      alert('Ошибка удаления');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!car) return <div>Автомобиль не найден</div>;

  return (
    <div>
      <Link to="/garage" className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Назад к гаражу
      </Link>

      {/* Заголовок */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              {car.brand_name} {car.model_name}
            </h1>
            <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {car.year && `${car.year} г. • `}
              {car.license_plate && `${car.license_plate} • `}
              {car.vin && `VIN: ${car.vin}`}
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <Trash2 size={16} /> Удалить
          </button>
        </div>

        {/* Пробег */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Пробег</div>
              {editMileage ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={newMileage}
                    onChange={e => setNewMileage(e.target.value)}
                    style={{ width: '150px' }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleMileageUpdate}>Сохранить</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMileage(false)}>Отмена</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {car.mileage?.toLocaleString() || 0} км
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMileage(true)}>
                    <Edit size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Информативные карточки */}
      <div className="grid grid-3" style={{ marginBottom: '0.5rem' }}>
        <div className="stat-card">
          <DollarSign size={24} style={{ color: 'var(--danger)', marginBottom: '0.5rem' }} />
          <div className="stat-value">
            {stats?.byCategory
              ? Math.round(stats.byCategory.reduce((s, c) => s + parseFloat(c.total), 0)).toLocaleString()
              : '0'} MDL
          </div>
          <div className="stat-label">Всего расходов</div>
        </div>
        <div className="stat-card">
          <TrendingUp size={24} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
          <div className="stat-value">
            {stats?.byMonth?.length > 0
              ? Math.round(stats.byMonth.reduce((s, m) => s + parseFloat(m.total), 0) / stats.byMonth.length).toLocaleString()
              : '0'} MDL
          </div>
          <div className="stat-label">Средний расход/мес</div>
        </div>
        <div className="stat-card">
          <Fuel size={24} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
          <div className="stat-value">
            {stats?.fuel?.avgConsumption ? `${stats.fuel.avgConsumption} л/100км` : '—'}
          </div>
          <div className="stat-label">Расход топлива</div>
        </div>
      </div>
      <div className="grid grid-3" style={{ marginBottom: '0.5rem' }}>
        <div className="stat-card">
          <Wrench size={24} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
          <div className="stat-value">{recentService.length}</div>
          <div className="stat-label">Сервисных записей</div>
        </div>
        <div className="stat-card">
          <Fuel size={24} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
          <div className="stat-value">{stats?.fuel?.refuels || 0}</div>
          <div className="stat-label">Заправок</div>
        </div>
        <div className="stat-card">
          <Bell size={24} style={{ color: 'var(--warning)', marginBottom: '0.5rem' }} />
          <div className="stat-value">{reminders.length}</div>
          <div className="stat-label">Напоминаний</div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <Link to={`/car/${id}/expenses`} className="btn btn-primary" style={{ padding: '1rem', justifyContent: 'center' }}>
          <DollarSign size={18} /> Расходы
        </Link>
        <Link to={`/car/${id}/service`} className="btn btn-primary" style={{ padding: '1rem', justifyContent: 'center' }}>
          <Wrench size={18} /> Сервис
        </Link>
        <Link to="/reminders" className="btn btn-primary" style={{ padding: '1rem', justifyContent: 'center' }}>
          <Bell size={18} /> Напоминания
        </Link>
      </div>

      {/* Расходы по категориям */}
      {stats?.byCategory?.length > 0 && (
        <div className="card">
          <h3 className="card-title">Расходы по категориям</h3>
          <div style={{ marginTop: '1rem' }}>
            {stats.byCategory.map(cat => (
              <div key={cat.name} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--border)'
              }}>
                <span>{cat.name}</span>
                <span style={{ fontWeight: 600 }}>{parseFloat(cat.total).toLocaleString()} MDL</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Последние записи сервиса */}
      {recentService.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Последние работы</h3>
            <Link to={`/car/${id}/service`} className="btn btn-secondary btn-sm">Все записи</Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Пробег</th>
                <th>Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {recentService.map(rec => (
                <tr key={rec.id}>
                  <td>{new Date(rec.date).toLocaleDateString('ru')}</td>
                  <td>{rec.service_type_name}</td>
                  <td>{rec.mileage?.toLocaleString()} км</td>
                  <td>{rec.cost ? `${parseFloat(rec.cost).toLocaleString()} MDL` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
