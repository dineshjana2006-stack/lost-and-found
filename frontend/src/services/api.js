import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Response interceptor – unwrap data ────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

// ─────────────────────────────────────────────────────────────
//  Lost Items
// ─────────────────────────────────────────────────────────────
export const lostApi = {
  list:   (params) => api.get('/lost/',   { params }),
  get:    (id)     => api.get(`/lost/${id}`),
  create: (data)   => api.post('/lost/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  update: (id, data) => api.put(`/lost/${id}`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  delete: (id) => api.delete(`/lost/${id}`),
}

// ─────────────────────────────────────────────────────────────
//  Found Items
// ─────────────────────────────────────────────────────────────
export const foundApi = {
  list:   (params) => api.get('/found/',   { params }),
  get:    (id)     => api.get(`/found/${id}`),
  create: (data)   => api.post('/found/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  update: (id, data) => api.put(`/found/${id}`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  delete: (id) => api.delete(`/found/${id}`),
}

// ─────────────────────────────────────────────────────────────
//  Search
// ─────────────────────────────────────────────────────────────
export const searchApi = {
  global:      (params)  => api.get('/search/',            { params }),
  suggestions: (q)       => api.get('/search/suggestions', { params: { q } }),
  categories:  ()        => api.get('/search/categories'),
}

// ─────────────────────────────────────────────────────────────
//  Matching Engine
// ─────────────────────────────────────────────────────────────
export const matchApi = {
  forLost:   (id, min_score) => api.get(`/match/lost/${id}`,    { params: { min_score } }),
  forFound:  (id, min_score) => api.get(`/match/found/${id}`,   { params: { min_score } }),
  preview:   (id)            => api.get(`/match/preview/${id}`),
}

// ─────────────────────────────────────────────────────────────
//  Match Analysis Reports
// ─────────────────────────────────────────────────────────────
export const reportApi = {
  get:     (lostId, foundId) => api.get(`/report/${lostId}/${foundId}`),
  resolve: (lostId, foundId) => api.patch(`/report/${lostId}/${foundId}/resolve`),
  recent:  (limit = 20)     => api.get('/report/recent', { params: { limit } }),
}

// ─────────────────────────────────────────────────────────────
//  Statistics
// ─────────────────────────────────────────────────────────────
export const statsApi = {
  full:    () => api.get('/stats/'),
  summary: () => api.get('/stats/summary'),
}

export default api
