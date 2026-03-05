import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, catalogAPI } from '../services/api';
import { Plus, X, Car } from 'lucide-react';

export default function GaragePage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [formData, setFormData] = useState({
    brand_id: '',
    model_id: '',
    year: '',
    vin: '',
    license_plate: '',
    mileage: ''
  });

  useEffect(() => {
    loadCars();
    loadBrands();
  }, []);

  const loadCars = async () => {
    try {
      const res = await carsAPI.getAll();
      setCars(res.data.cars);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    const res = await catalogAPI.getBrands();
    setBrands(res.data.brands);
  };

  const loadModels = async (brandId) => {
    if (!brandId) {
      setModels([]);
      return;
    }
    const res = await catalogAPI.getModels(brandId);
    setModels(res.data.models);
  };

  const handleBrandChange = (e) => {
    const brandId = e.target.value;
    setFormData({ ...formData, brand_id: brandId, model_id: '' });
    loadModels(brandId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await carsAPI.create({
        ...formData,
        brand_id: parseInt(formData.brand_id),
        model_id: parseInt(formData.model_id),
        year: formData.year ? parseInt(formData.year) : null,
        mileage: formData.mileage ? parseInt(formData.mileage) : 0
      });
      setShowModal(false);
      setFormData({ brand_id: '', model_id: '', year: '', vin: '', license_plate: '', mileage: '' });
      loadCars();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка добавления');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить автомобиль?')) return;
    try {
      await carsAPI.delete(id);
      loadCars();
    } catch (error) {
      alert('Ошибка удаления');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Гараж</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Добавить авто
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Car size={48} className="empty-state-icon" />
            <p>У вас пока нет автомобилей</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: '1rem' }}>
              Добавить первый автомобиль
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-3">
          {cars.map(car => (
            <div key={car.id} className="car-card">
              <Link to={`/car/${car.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="car-card-title">{car.brand_name} {car.model_name}</div>
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
              <button 
                className="btn btn-danger btn-sm" 
                onClick={() => handleDelete(car.id)}
                style={{ marginTop: '1rem' }}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Добавить автомобиль</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Марка *</label>
                <select 
                  className="form-select" 
                  value={formData.brand_id} 
                  onChange={handleBrandChange}
                  required
                >
                  <option value="">Выберите марку</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Модель *</label>
                <select 
                  className="form-select" 
                  value={formData.model_id} 
                  onChange={e => setFormData({ ...formData, model_id: e.target.value })}
                  required
                  disabled={!formData.brand_id}
                >
                  <option value="">Выберите модель</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Год выпуска</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: e.target.value })}
                    min="1900" max={new Date().getFullYear() + 1}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Пробег (км)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formData.mileage}
                    onChange={e => setFormData({ ...formData, mileage: e.target.value })}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">VIN</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.vin}
                  onChange={e => setFormData({ ...formData, vin: e.target.value })}
                  maxLength="17"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Госномер</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.license_plate}
                  onChange={e => setFormData({ ...formData, license_plate: e.target.value })}
                  placeholder="А123БВ777"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
