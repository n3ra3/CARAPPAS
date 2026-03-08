import { useState, useEffect } from 'react';
import { documentsAPI, carsAPI } from '../services/api';
import { Plus, X, Trash2, FileText, AlertTriangle, Car, Calendar, Clock } from 'lucide-react';

const DOC_TYPES = [
  { id: 'license', name: 'Водительское удостоверение', icon: '🪪' },
  { id: 'osago', name: 'ОСАГО', icon: '📋' },
  { id: 'kasko', name: 'КАСКО', icon: '🛡️' },
  { id: 'sts', name: 'СТС', icon: '📄' },
  { id: 'pts', name: 'ПТС', icon: '📑' },
  { id: 'diagnostic', name: 'Диагностическая карта', icon: '🔧' },
  { id: 'passport', name: 'Паспорт', icon: '🛂' },
  { id: 'other', name: 'Другой документ', icon: '📎' }
];

const DOC_TYPE_MAP = DOC_TYPES.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState({
    doc_type: 'osago',
    title: 'ОСАГО',
    doc_number: '',
    car_id: '',
    issue_date: '',
    expiry_date: '',
    notify_days_before: 30,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docsRes, carsRes] = await Promise.all([
        documentsAPI.getAll(),
        carsAPI.getAll()
      ]);
      setDocuments(docsRes.data.documents);
      setCars(carsRes.data.cars);
    } finally {
      setLoading(false);
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'none', text: 'Бессрочный', color: 'var(--text-secondary)', badge: 'badge-secondary' };
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', text: 'Просрочен', color: 'var(--danger)', badge: 'badge-danger', days: diffDays };
    } else if (diffDays <= 7) {
      return { status: 'critical', text: `${diffDays} дн.`, color: 'var(--danger)', badge: 'badge-danger', days: diffDays };
    } else if (diffDays <= 30) {
      return { status: 'warning', text: `${diffDays} дн.`, color: 'var(--warning)', badge: 'badge-warning', days: diffDays };
    } else if (diffDays <= 90) {
      return { status: 'soon', text: `${diffDays} дн.`, color: 'var(--primary)', badge: 'badge-primary', days: diffDays };
    } else {
      return { status: 'ok', text: `${diffDays} дн.`, color: 'var(--success)', badge: 'badge-success', days: diffDays };
    }
  };

  const openModal = (doc = null) => {
    if (doc) {
      setEditingDoc(doc);
      setFormData({
        doc_type: doc.doc_type,
        title: doc.title,
        doc_number: doc.doc_number || '',
        car_id: doc.car_id || '',
        issue_date: doc.issue_date?.split('T')[0] || '',
        expiry_date: doc.expiry_date?.split('T')[0] || '',
        notify_days_before: doc.notify_days_before || 30,
        notes: doc.notes || ''
      });
    } else {
      setEditingDoc(null);
      setFormData({
        doc_type: 'osago',
        title: 'ОСАГО',
        doc_number: '',
        car_id: '',
        issue_date: '',
        expiry_date: '',
        notify_days_before: 30,
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleDocTypeChange = (docType) => {
    const type = DOC_TYPE_MAP[docType];
    setFormData({ 
      ...formData, 
      doc_type: docType,
      title: type?.name || formData.title
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        car_id: formData.car_id ? parseInt(formData.car_id) : null,
        notify_days_before: parseInt(formData.notify_days_before),
        issue_date: formData.issue_date || null,
        expiry_date: formData.expiry_date || null
      };

      if (editingDoc) {
        await documentsAPI.update(editingDoc.id, data);
      } else {
        await documentsAPI.create(data);
      }
      
      setShowModal(false);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await documentsAPI.delete(id);
      loadData();
    } catch (error) {
      alert('Ошибка');
    }
  };

  const expiringDocs = documents.filter(d => {
    const status = getExpiryStatus(d.expiry_date);
    return status.status === 'expired' || status.status === 'critical' || status.status === 'warning';
  });

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Документы</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={20} /> Добавить
        </button>
      </div>

      {/* Предупреждение об истекающих документах */}
      {expiringDocs.length > 0 && (
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderLeft: '4px solid var(--warning)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} color="var(--warning)" />
            <div>
              <div style={{ fontWeight: 600, color: '#92400e' }}>
                {expiringDocs.length} {expiringDocs.length === 1 ? 'документ требует' : 'документов требуют'} внимания
              </div>
              <div style={{ fontSize: '0.875rem', color: '#a16207' }}>
                Проверьте сроки действия и обновите документы
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Список документов */}
      {documents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FileText size={48} className="empty-state-icon" />
            <p>Нет документов</p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              Добавить первый документ
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {documents.map(doc => {
            const expiry = getExpiryStatus(doc.expiry_date);
            const docType = DOC_TYPE_MAP[doc.doc_type];
            
            return (
              <div 
                key={doc.id} 
                className="card" 
                style={{ 
                  cursor: 'pointer',
                  borderLeft: `4px solid ${expiry.color}`,
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={() => openModal(doc)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                    <div style={{ fontSize: '2rem' }}>{docType?.icon || '📎'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                        {doc.title}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {docType?.name}
                      </div>
                      {doc.doc_number && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                          № {doc.doc_number}
                        </div>
                      )}
                      {doc.brand_name && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          color: 'var(--text-secondary)', 
                          fontSize: '0.875rem', 
                          marginTop: '0.5rem' 
                        }}>
                          <Car size={14} /> {doc.brand_name} {doc.model_name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span className={`badge ${expiry.badge}`}>
                      <Clock size={12} style={{ marginRight: '0.25rem' }} />
                      {expiry.text}
                    </span>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {doc.expiry_date && (
                  <div style={{ 
                    marginTop: '1rem', 
                    paddingTop: '1rem', 
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {doc.issue_date && (
                      <span>Выдан: {new Date(doc.issue_date).toLocaleDateString('ru')}</span>
                    )}
                    <span style={{ color: expiry.color, fontWeight: 500 }}>
                      До: {new Date(doc.expiry_date).toLocaleDateString('ru')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDoc ? 'Редактировать документ' : 'Добавить документ'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Тип документа */}
              <div className="form-group">
                <label className="form-label">Тип документа *</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '0.5rem' 
                }}>
                  {DOC_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleDocTypeChange(type.id)}
                      style={{
                        padding: '0.75rem 0.5rem',
                        border: `2px solid ${formData.doc_type === type.id ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        background: formData.doc_type === type.id ? 'var(--primary)' : 'white',
                        color: formData.doc_type === type.id ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
                      <span style={{ fontSize: '0.7rem', textAlign: 'center' }}>{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Название */}
              <div className="form-group">
                <label className="form-label">Название *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Номер документа */}
              <div className="form-group">
                <label className="form-label">Номер документа</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.doc_number}
                  onChange={e => setFormData({ ...formData, doc_number: e.target.value })}
                  placeholder="1234 567890"
                />
              </div>

              {/* Привязка к авто */}
              <div className="form-group">
                <label className="form-label">Привязать к автомобилю</label>
                <select
                  className="form-select"
                  value={formData.car_id}
                  onChange={e => setFormData({ ...formData, car_id: e.target.value })}
                >
                  <option value="">Не привязывать</option>
                  {cars.map(c => (
                    <option key={c.id} value={c.id}>{c.brand_name} {c.model_name}</option>
                  ))}
                </select>
              </div>

              {/* Даты */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Дата выдачи</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.issue_date}
                    onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Срок действия</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expiry_date}
                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Напомнить за */}
              <div className="form-group">
                <label className="form-label">Напомнить за (дней до истечения)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[7, 14, 30, 60, 90].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setFormData({ ...formData, notify_days_before: days })}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: `2px solid ${formData.notify_days_before === days ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        background: formData.notify_days_before === days ? 'var(--primary)' : 'white',
                        color: formData.notify_days_before === days ? 'white' : 'var(--text)',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      {days}
                    </button>
                  ))}
                </div>
              </div>

              {/* Заметки */}
              <div className="form-group">
                <label className="form-label">Заметки</label>
                <textarea
                  className="form-input"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDoc ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
