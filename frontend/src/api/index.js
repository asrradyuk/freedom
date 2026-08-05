import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://freedom-b3m3.onrender.com/api/v1'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData || ''
  if (initData) config.headers['X-Init-Data'] = initData
  return config
})

export const authApi = {
  me: () => api.post('/auth/auth'),
}

export const clientsApi = {
  list: () => api.get('/clients/'),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.patch(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
}

export const sessionsApi = {
  list: (clientId) => api.get(`/clients/${clientId}/sessions/`),
  create: (clientId, data) => api.post(`/clients/${clientId}/sessions/`, data),
  update: (clientId, id, data) => api.patch(`/clients/${clientId}/sessions/${id}`, data),
  delete: (clientId, id) => api.delete(`/clients/${clientId}/sessions/${id}`),
}

export const packagesApi = {
  list: (clientId) => api.get(`/clients/${clientId}/packages/`),
  create: (clientId, data) => api.post(`/clients/${clientId}/packages/`, data),
  update: (clientId, id, data) => api.patch(`/clients/${clientId}/packages/${id}`, data),
  delete: (clientId, id) => api.delete(`/clients/${clientId}/packages/${id}`),
}

export const materialsApi = {
  list: (clientId) => api.get(`/clients/${clientId}/materials/`),
  upload: (clientId, file, displayName, folder) => {
    const form = new FormData()
    form.append('file', file)
    const params = new URLSearchParams()
    if (displayName) params.append('display_name', displayName)
    if (folder) params.append('folder', folder)
    return api.post(`/clients/${clientId}/materials/?${params}`, form)
  },
  getDownloadUrl: (clientId, materialId) =>
    api.get(`/clients/${clientId}/materials/${materialId}/download-url`),
  delete: (clientId, id) => api.delete(`/clients/${clientId}/materials/${id}`),
}

export const subscriptionApi = {
  get: () => api.get('/subscription/'),
  paymentUrl: () => api.get('/subscription/payment-url'),
}

export const livekitApi = {
  getToken: (clientId) => api.post(`/livekit/token/${clientId}`),
  getClientToken: (clientId, tgId) =>
    api.post(`/livekit/client-token/${clientId}?tg_id=${tgId}`),
}

export const BASE_API_URL = BASE_URL
export default api