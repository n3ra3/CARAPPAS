import { useState, useEffect } from 'react';
import { remindersAPI, carsAPI } from '../services/api';
import { Plus, X, Check, Trash2, Bell, Calendar, Gauge } from 'lucide-react';

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    car_id: '',
    title: '',
    description: '',
    reminder_type: 'date',
    due_date: '',
    due_mileage: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [remindersRes, carsRes] = await Promise.all([
        remindersAPI.getAll(),
        carsAPI.getAll()
      ]);
      setReminders(remindersRes.data.reminders);
      setCars(carsRes.data.cars);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await remindersAPI.create({
        ...formData,
        car_id: parseInt(formData.car_id),
        due_mileage: formData.due_mileage ? parseInt(formData.due_mileage) : null
      });
      setShowModal(false);
      setFormData({
        car_id: '',
        title: '',
        description: '',
        reminder_type: 'date',
        due_date: '',
        due_mileage: ''
      });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка');
    }
  };

  const handleComplete = async (id) => {
    try {
      await remindersAPI.complete(id);
      loadData();
    } catch (error) {
      alert('Ошибка');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить напоминание?')) return;
    try {
      await remindersAPI.delete(id);
      loadData();
    } catch (error) {
      alert('Ошибка');
    }
  };

  const activeReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Напоминания</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={cars.length === 0}>
          <Plus size={20} /> Добавить
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Bell size={48} className="empty-state-icon" />
            <p>Сначала добавьте автомобиль в гараж</p>
          </div>
        </div>
      ) : (
        <>
          {/* Активные */}
          <div className="card">
            <h3 className="card-title">Активные ({activeReminders.length})</h3>
            
            {activeReminders.length === 0 ? (
              <div className="empty-state">
                <p>Нет активных напоминаний</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {activeReminders.map(r => (
                  <div key={r.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius)',
                    borderLeft: `4px solid ${r.reminder_type === 'date' ? 'var(--warning)' : 'var(--danger)'}`
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {r.brand_name} {r.model_name}
                        {r.description && ` • ${r.description}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className={`badge ${r.reminder_type === 'date' ? 'badge-warning' : 'badge-danger'}`}>
                        {r.reminder_type === 'date' ? (
                          <><Calendar size={14} style={{ marginRight: '0.25rem' }} />
                          {new Date(r.due_date).toLocaleDateString('ru')}</>
                        ) : (
                          <><Gauge size={14} style={{ marginRight: '0.25rem' }} />
                          {r.due_mileage?.toLocaleString()} км</>
                        )}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleComplete(r.id)}>
                        <Check size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Выполненные */}
          {completedReminders.length > 0 && (
            <div className="card">
              <h3 className="card-title">Выполненные ({completedReminders.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {completedReminders.map(r => (
                  <div key={r.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    opacity: 0.6
                  }}>
                    <div>
                      <div style={{ textDecoration: 'line-through' }}>{r.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {r.brand_name} {r.model_name}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(r.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Добавить напоминание</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Автомобиль *</label>
                <select
                  className="form-select"
                  value={formData.car_id}
                  onChange={e => setFormData({ ...formData, car_id: e.target.value })}
                  required
                >
                  <option value="">Выберите авто</option>
                  {cars.map(c => (
                    <option key={c.id} value={c.id}>{c.brand_name} {c.model_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Название *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Например: Замена масла"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Тип напоминания *</label>
                <select
                  className="form-select"
                  value={formData.reminder_type}
                  onChange={e => setFormData({ ...formData, reminder_type: e.target.value })}
                >
                  <option value="date">По дате</option>
                  <option value="mileage">По пробегу</option>
                </select>
              </div>

              {formData.reminder_type === 'date' ? (
                <div className="form-group">
                  <label className="form-label">Дата *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Пробег (км) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.due_mileage}
                    onChange={e => setFormData({ ...formData, due_mileage: e.target.value })}
                    required
                    placeholder="Например: 45000"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Описание</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
