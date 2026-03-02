import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data)
};

// Cars API
export const carsAPI = {
  getAll: () => api.get('/cars'),
  getById: (id) => api.get(`/cars/${id}`),
  create: (data) => api.post('/cars', data),
  update: (id, data) => api.put(`/cars/${id}`, data),
  delete: (id) => api.delete(`/cars/${id}`),
  updateMileage: (id, mileage) => api.put(`/cars/${id}/mileage`, { mileage })
};

// Service API
export const serviceAPI = {
  getTypes: () => api.get('/service/types'),
  getByCar: (carId) => api.get(`/service/car/${carId}`),
  getById: (id) => api.get(`/service/${id}`),
  create: (data) => api.post('/service', data),
  update: (id, data) => api.put(`/service/${id}`, data),
  delete: (id) => api.delete(`/service/${id}`)
};

// Expenses API
export const expensesAPI = {
  getCategories: () => api.get('/expenses/categories'),
  getByCar: (carId, params) => api.get(`/expenses/car/${carId}`, { params }),
  getStats: (carId) => api.get(`/expenses/car/${carId}/stats`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`)
};

// Reminders API
export const remindersAPI = {
  getAll: () => api.get('/reminders'),
  getActive: () => api.get('/reminders/active'),
  getByCar: (carId) => api.get(`/reminders/car/${carId}`),
  create: (data) => api.post('/reminders', data),
  update: (id, data) => api.put(`/reminders/${id}`, data),
  complete: (id) => api.put(`/reminders/${id}/complete`),
  delete: (id) => api.delete(`/reminders/${id}`)
};

// Catalog API
export const catalogAPI = {
  getBrands: (search) => api.get('/catalog/brands', { params: { search } }),
  getModels: (brandId, search) => api.get(`/catalog/brands/${brandId}/models`, { params: { search } })
};

// Documents API
export const documentsAPI = {
  getAll: () => api.get('/documents'),
  getTypes: () => api.get('/documents/types'),
  getExpiring: () => api.get('/documents/expiring'),
  getById: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`)
};

export default api;
