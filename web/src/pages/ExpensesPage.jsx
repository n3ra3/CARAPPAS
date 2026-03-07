import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { carsAPI, expensesAPI } from '../services/api';
import { Plus, X, ArrowLeft, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#64748b'];

export default function ExpensesPage() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    mileage: '',
    fuel_volume: '',
    fuel_price: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [carRes, expensesRes, categoriesRes, statsRes] = await Promise.all([
        carsAPI.getById(id),
        expensesAPI.getByCar(id),
        expensesAPI.getCategories(),
        expensesAPI.getStats(id)
      ]);
      setCar(carRes.data.car);
      setExpenses(expensesRes.data.expenses);
      setCategories(categoriesRes.data.categories);
      setStats(statsRes.data.stats);
      setFormData(prev => ({ ...prev, mileage: carRes.data.car.mileage || '' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await expensesAPI.create({
        car_id: parseInt(id),
        ...formData,
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount),
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        fuel_volume: formData.fuel_volume ? parseFloat(formData.fuel_volume) : null,
        fuel_price: formData.fuel_price ? parseFloat(formData.fuel_price) : null
      });
      setShowModal(false);
      setFormData({
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        mileage: car?.mileage || '',
        fuel_volume: '',
        fuel_price: '',
        description: ''
      });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка добавления');
    }
  };

  const handleDelete = async (expenseId) => {
    if (!confirm('Удалить запись?')) return;
    try {
      await expensesAPI.delete(expenseId);
      loadData();
    } catch (error) {
      alert('Ошибка удаления');
    }
  };

  const isFuelCategory = () => {
    const cat = categories.find(c => c.id === parseInt(formData.category_id));
    return cat?.name === 'Топливо';
  };

  const chartData = stats?.byCategory?.map((cat, i) => ({
    name: cat.name,
    value: parseFloat(cat.total),
    color: COLORS[i % COLORS.length]
  })) || [];

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <Link to={`/car/${id}`} className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Назад
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">Расходы</h1>
          <div style={{ color: 'var(--text-secondary)' }}>{car?.brand_name} {car?.model_name}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Добавить расход
        </button>
      </div>

      {/* Статистика */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="card-title">Расходы по категориям</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toLocaleString()} MDL`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {stats?.fuel?.avgConsumption && (
            <div style={{ textAlign: 'center', marginTop: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                {stats.fuel.avgConsumption} л/100км
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>Средний расход топлива</div>
            </div>
          )}
        </div>
      )}

      {/* Таблица */}
      {expenses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>Расходов пока нет</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: '1rem' }}>
              Добавить первый расход
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Категория</th>
                <th>Описание</th>
                <th>Пробег</th>
                <th>Сумма</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td>{new Date(exp.date).toLocaleDateString('ru')}</td>
                  <td>{exp.category_name}</td>
                  <td>
                    {exp.fuel_volume 
                      ? `${exp.fuel_volume} л × ${exp.fuel_price} MDL` 
                      : (exp.description || '—')}
                  </td>
                  <td>{exp.mileage ? `${exp.mileage.toLocaleString()} км` : '—'}</td>
                  <td style={{ fontWeight: 600 }}>{parseFloat(exp.amount).toLocaleString()} MDL</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp.id)}>
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
              <h3 className="modal-title">Добавить расход</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Категория *</label>
                <select
                  className="form-select"
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

              {isFuelCategory() && (
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Объём (л)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.fuel_volume}
                      onChange={e => {
                        const vol = e.target.value;
                        const price = formData.fuel_price;
                        setFormData({ 
                          ...formData, 
                          fuel_volume: vol,
                          amount: vol && price ? (parseFloat(vol) * parseFloat(price)).toFixed(2) : formData.amount
                        });
                      }}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Цена за литр (MDL)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.fuel_price}
                      onChange={e => {
                        const price = e.target.value;
                        const vol = formData.fuel_volume;
                        setFormData({ 
                          ...formData, 
                          fuel_price: price,
                          amount: vol && price ? (parseFloat(vol) * parseFloat(price)).toFixed(2) : formData.amount
                        });
                      }}
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Сумма (MDL) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  required
                  step="0.01"
                />
              </div>

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
