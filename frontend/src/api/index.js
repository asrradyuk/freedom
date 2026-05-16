import axios from 'axios'

const BASE_URL = 'https://freedom-b3m3.onrender.com/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
})

api.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData || ''
  if (initData) config.headers['X-Init-Data'] = initData
  return config
})

export const authApi = {
  me: () => api.post('/auth/auth'),
}

export const clientsApi = {
  list: () => api.get('/clients'),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.patch(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
}

export const sessionsApi = {
  list: (clientId) => api.get(`/clients/${clientId}/sessions`),
  create: (clientId, data) => api.post(`/clients/${clientId}/sessions`, data),
  update: (clientId, id, data) => api.patch(`/clients/${clientId}/sessions/${id}`, data),
  delete: (clientId, id) => api.delete(`/clients/${clientId}/sessions/${id}`),
}

export const materialsApi = {
  list: (clientId) => api.get(`/clients/${clientId}/materials`),
  upload: (clientId, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/clients/${clientId}/materials`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  download: (clientId, materialId) =>
    `${BASE_URL}/clients/${clientId}/materials/${materialId}/download`,
  delete: (clientId, id) => api.delete(`/clients/${clientId}/materials/${id}`),
}

export const subscriptionApi = {
  get: () => api.get('/subscription'),
  confirm: () => api.post('/subscription/confirm'),
}

export const livekitApi = {
  getToken: (clientId) => api.post(`/livekit/token/${clientId}`),
}

export default api