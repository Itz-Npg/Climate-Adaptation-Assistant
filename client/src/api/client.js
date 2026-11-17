import axios from 'axios';

/**
 * All requests go to /api. In development Vite proxies them to the Express
 * server on port 5000; in production Express serves the built app itself, so
 * the same origin is used and the HTTP-only JWT cookie is sent automatically.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Make sure the backend is running on port 5000.';
  }
  return error?.message || fallback;
}

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  verifyMfa: (payload) => api.post('/auth/mfa/verify', payload),
  setupMfa: () => api.post('/auth/mfa/setup'),
  enableMfa: (payload) => api.post('/auth/mfa/enable', payload),
  disableMfa: (payload) => api.post('/auth/mfa/disable', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
};

export const riskApi = {
  list: () => api.get('/risks'),
  get: (id) => api.get(`/risks/${id}`),
  create: (payload) => api.post('/risks', payload),
  remove: (id) => api.delete(`/risks/${id}`),
};

export const planApi = {
  list: () => api.get('/plans'),
  get: (id) => api.get(`/plans/${id}`),
  create: (payload) => api.post('/plans', payload),
  update: (id, payload) => api.put(`/plans/${id}`, payload),
  remove: (id) => api.delete(`/plans/${id}`),
};

export const geoApi = {
  search: (query, count = 6) => api.get('/geo/search', { params: { q: query, count } }),
  profile: (lat, lon) => api.get('/geo/profile', { params: { lat, lon } }),
};

export const comparisonApi = {
  list: () => api.get('/comparisons'),
  create: (payload) => api.post('/comparisons', payload),
  remove: (id) => api.delete(`/comparisons/${id}`),
};

export default api;
