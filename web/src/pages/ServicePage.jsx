import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { carsAPI, serviceAPI } from '../services/api';
import { Plus, X, ArrowLeft, Trash2 } from 'lucide-react';

export default function ServicePage() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [records, setRecords] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    service_type_id: '',
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    description: '',
    cost: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [carRes, recordsRes, typesRes] = await Promise.all([
        carsAPI.getById(id),
        serviceAPI.getByCar(id),
        serviceAPI.getTypes()
      ]);
      setCar(carRes.data.car);
      setRecords(recordsRes.data.records);
      setTypes(typesRes.data.types);
      setFormData(prev => ({ ...prev, mileage: carRes.data.car.mileage || '' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await serviceAPI.create({
        car_id: parseInt(id),
        ...formData,
        service_type_id: parseInt(formData.service_type_id),
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null
      });
      setShowModal(false);
      setFormData({
        service_type_id: '',
        date: new Date().toISOString().split('T')[0],
        mileage: car?.mileage || '',
        description: '',
        cost: ''
      });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка добавления');
    }
  };

  const handleDelete = async (recordId) => {
    if (!confirm('Удалить запись?')) return;
    try {
      await serviceAPI.delete(recordId);
      loadData();
    } catch (error) {
      alert('Ошибка удаления');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <Link to={`/car/${id}`} className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Назад
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">Сервисная книжка</h1>
          <div style={{ color: 'var(--text-secondary)' }}>{car?.brand_name} {car?.model_name}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Добавить запись
        </button>
      </div>

      {records.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>Записей пока нет</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: '1rem' }}>
              Добавить первую запись
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип работ</th>
                <th>Описание</th>
                <th>Пробег</th>
                <th>Стоимость</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec.id}>
                  <td>{new Date(rec.date).toLocaleDateString('ru')}</td>
                  <td>{rec.service_type_name}</td>
                  <td>{rec.description || '—'}</td>
                  <td>{rec.mileage ? `${rec.mileage.toLocaleString()} км` : '—'}</td>
                  <td>{rec.cost ? `${parseFloat(rec.cost).toLocaleString()} MDL` : '—'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rec.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Добавить запись</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Тип работ *</label>
                <select
                  className="form-select"
                  value={formData.service_type_id}
                  onChange={e => setFormData({ ...formData, service_type_id: e.target.value })}
                  required
                >
                  <option value="">Выберите тип</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Дата *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Пробег (км)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.mileage}
                    onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Что было сделано"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Стоимость (MDL)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: e.target.value })}
                  step="0.01"
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
