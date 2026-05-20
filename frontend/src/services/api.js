import axios from 'axios';
import { auth } from '../firebase';

const BASE = process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: BASE });

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  if (auth && auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getJobs         = (params)     => api.get('/api/v1/jobs', { params });
export const getCompanyJobs  = ()           => api.get('/api/v1/jobs/company/me');
export const getJobDetail    = (id)         => api.get(`/api/v1/jobs/${id}`);
export const getJobsByCity   = (city)       => api.get(`/api/v1/jobs/city/${city}`);
export const createJob       = (data)       => api.post('/api/v1/jobs', data);
export const updateJob       = (id, data)   => api.put(`/api/v1/jobs/${id}`, data);
export const deleteJob       = (id)         => api.delete(`/api/v1/jobs/${id}`);
export const applyToJob      = (data)       => api.post('/api/v1/apply', data);
export const createJobAlert  = (data)       => api.post('/api/v1/notifications/subscribe', data);
export const getMyAlerts     = ()           => api.get('/api/v1/notifications/alerts');
export const deleteAlert     = (id)         => api.delete(`/api/v1/notifications/alerts/${id}`);

// ── Search ───────────────────────────────────────────────────────────────────
export const searchJobs      = (params)     => api.get('/api/v1/search', { params });
export const autocomplete    = (q, field)   => api.get('/api/v1/autocomplete', { params: { q, field } });
export const getHistory      = ()           => api.get('/api/v1/history');
export const clearHistory    = ()           => api.delete('/api/v1/history');
export const deleteHistoryItem = (id)       => api.delete(`/api/v1/history/${id}`);

// ── AI Agent ─────────────────────────────────────────────────────────────────
export const chatWithAI      = (message, history) => api.post('/api/v1/ai/chat', { message, history });

export default api;
