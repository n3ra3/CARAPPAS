import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, remindersAPI, expensesAPI } from '../services/api';
import { Car, Bell, AlertTriangle, Plus, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const [cars, setCars] = useState([]);
  const [reminders, setReminders] = useState({ byDate: [], byMileage: [] });
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [carsRes, remindersRes] = await Promise.all([
        carsAPI.getAll(),
        remindersAPI.getActive()
      ]);
      setCars(carsRes.data.cars);
      setReminders(remindersRes.data.reminders);

      // Загрузка общей суммы расходов по всем авто
      if (carsRes.data.cars.length > 0) {
        const statsPromises = carsRes.data.cars.map(car => expensesAPI.getStats(car.id).catch(() => null));
        const allStats = await Promise.all(statsPromises);
        const total = allStats.reduce((sum, res) => {
          if (!res?.data?.stats?.byCategory) return sum;
          return sum + res.data.stats.byCategory.reduce((s, c) => s + parseFloat(c.total), 0);
        }, 0);
        setTotalExpenses(Math.round(total));
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalReminders = reminders.byDate.length + reminders.byMileage.length;

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div>
      <h1 className="page-title">Главная</h1>

      {/* Статистика */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value">{cars.length}</div>
          <div className="stat-label">Автомобилей в гараже</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: totalReminders > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {totalReminders}
          </div>
          <div className="stat-label">Активных напоминаний</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {cars.reduce((sum, car) => sum + (car.mileage || 0), 0).toLocaleString()}
          </div>
          <div className="stat-label">Общий пробег (км)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {totalExpenses.toLocaleString()} MDL
          </div>
          <div className="stat-label">Всего расходов</div>
        </div>
      </div>

      {/* Напоминания */}
      {totalReminders > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <AlertTriangle size={20} style={{ marginRight: '0.5rem', color: 'var(--warning)' }} />
              Требует внимания
            </h2>
            <Link to="/reminders" className="btn btn-secondary btn-sm">
              Все напоминания
            </Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...reminders.byDate, ...reminders.byMileage].slice(0, 5).map(reminder => (
              <div key={reminder.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.75rem',
                background: 'var(--bg)',
                borderRadius: 'var(--radius)'
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{reminder.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {reminder.brand_name} {reminder.model_name}
                  </div>
                </div>
                <div className={`badge ${reminder.reminder_type === 'date' ? 'badge-warning' : 'badge-danger'}`}>
                  {reminder.reminder_type === 'date' 
                    ? new Date(reminder.due_date).toLocaleDateString('ru')
                    : `${reminder.due_mileage?.toLocaleString()} км`
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Автомобили */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Car size={20} style={{ marginRight: '0.5rem' }} />
            Мои автомобили
          </h2>
          <Link to="/garage" className="btn btn-primary btn-sm">
            <Plus size={16} /> Добавить
          </Link>
        </div>

        {cars.length === 0 ? (
          <div className="empty-state">
            <Car size={48} className="empty-state-icon" />
            <p>У вас пока нет автомобилей</p>
            <Link to="/garage" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Добавить автомобиль
            </Link>
          </div>
        ) : (
          <div className="grid grid-3">
            {cars.map(car => (
              <Link to={`/car/${car.id}`} key={car.id} className="car-card">
                <div className="car-card-title">
                  {car.brand_name} {car.model_name}
                </div>
                <div className="car-card-info">
                  {car.year && <span>{car.year} г. • </span>}
                  <span>{car.mileage?.toLocaleString() || 0} км</span>
                </div>
                {car.license_plate && (
                  <div className="car-card-info" style={{ marginTop: '0.25rem' }}>
                    {car.license_plate}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
