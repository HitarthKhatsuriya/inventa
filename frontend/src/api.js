import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
})

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mediq_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mediq_token')
      localStorage.removeItem('mediq_user')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth API ────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// ── Doctor API ──────────────────────────────────────────────────────────
export const doctorAPI = {
  list: (params) => api.get('/doctors', { params }),
  get: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  getSlots: (id) => api.get(`/doctors/${id}/slots`),
  createSlot: (id, data) => api.post(`/doctors/${id}/slots`, data),
  deleteSlot: (doctorId, slotId) => api.delete(`/doctors/${doctorId}/slots/${slotId}`),
}

// ── Appointment API ─────────────────────────────────────────────────────
export const appointmentAPI = {
  list: (params) => api.get('/appointments', { params }),
  create: (data) => api.post('/appointments', data),
  get: (id) => api.get(`/appointments/${id}`),
  updateStatus: (id, status) => api.put(`/appointments/${id}/status`, { status }),
  cancel: (id) => api.delete(`/appointments/${id}`),
}

// ── Queue API ───────────────────────────────────────────────────────────
export const queueAPI = {
  todayQueue: (doctorId) => api.get(`/queue/${doctorId}/today`),
  startConsultation: (appointmentId) => api.post(`/queue/${appointmentId}/start`),
  endConsultation: (appointmentId) => api.post(`/queue/${appointmentId}/end`),
  markArrived: (appointmentId) => api.post(`/queue/${appointmentId}/arrived`),
  markNoShow: (appointmentId) => api.post(`/queue/${appointmentId}/noshow`),
  insertEmergency: (data) => api.post('/queue/emergency', data),
}

// ── Wait Time API (public) ──────────────────────────────────────────────
export const waitTimeAPI = {
  get: (bookingReference) => api.get(`/wait-time/${bookingReference}`),
}

// ── Analytics API ───────────────────────────────────────────────────────
export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
  doctorStats: (id) => api.get(`/analytics/doctor/${id}`),
  peakHours: (days) => api.get('/analytics/peak-hours', { params: { days } }),
}

// ── Notification API ────────────────────────────────────────────────────
export const notificationAPI = {
  list: () => api.get('/notifications'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
}

// ── Admin API ───────────────────────────────────────────────────────────
export const adminAPI = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', { settings }),
  listUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  toggleUserActive: (id) => api.put(`/admin/users/${id}/toggle-active`),
}

export default api
