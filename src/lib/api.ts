import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

export const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Types ────────────────────────────────────────────────────────────────

export type WAStatus = 'disconnected' | 'waiting_qr' | 'connected'

export type BroadcastStatus = 'pending' | 'sending' | 'completed' | 'failed' | 'cancelled'
export type ScheduleType = 'once' | 'recurring'

export interface BroadcastSummary {
  id: number
  name: string
  excel_name: string
  schedule_type: ScheduleType
  scheduled_at: string | null
  cron_expr: string
  status: BroadcastStatus
  total_count: number
  sent_count: number
  failed_count: number
  last_sent_at: string | null
  created_at: string
}

export interface MessageLog {
  id: number
  broadcast_id: number
  patient_name: string
  phone: string
  status: 'sent' | 'failed'
  error: string
  sent_at: string
}

export interface WAMe {
  phone: string   // connected WA number e.g. "6281234567890", empty if not connected
  username: string
}

// ─── API calls ────────────────────────────────────────────────────────────

export const waApi = {
  status: () => api.get<{ status: WAStatus }>('/api/wa/status'),
  qr: () => api.get<{ qr: string | null; status: WAStatus }>('/api/wa/qr'),
  me: () => api.get<WAMe>('/api/wa/me'),
  logout: () => api.post('/api/wa/logout'),
  reconnect: () => api.post('/api/wa/reconnect'),
}

export const broadcastApi = {
  create: (form: FormData) => api.post<BroadcastSummary>('/api/broadcasts', form),
  list: () => api.get<BroadcastSummary[]>('/api/broadcasts'),
  get: (id: number) => api.get<BroadcastSummary>(`/api/broadcasts/${id}`),
  cancel: (id: number) => api.delete(`/api/broadcasts/${id}`),
  logs: (id: number) => api.get<MessageLog[]>(`/api/broadcasts/${id}/logs`),
  downloadUrl: (id: number) => `${BASE}/api/broadcasts/${id}/download`,
}

export const authApi = {
  login: (username: string, password: string) => api.post<{ token: string }>('/api/auth/login', { username, password })
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Format a raw WA phone number for display, e.g. "6281234567890" → "+62 812-3456-7890" */
export function formatWAPhone(raw: string): string {
  if (!raw) return ''
  // Strip leading zeros or plus
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('62') && digits.length >= 10) {
    const local = '0' + digits.slice(2)
    // Format: 0812-3456-7890
    if (local.length === 12) {
      return `+62 ${local.slice(1, 4)}-${local.slice(4, 8)}-${local.slice(8)}`
    }
    if (local.length === 11) {
      return `+62 ${local.slice(1, 3)}-${local.slice(3, 7)}-${local.slice(7)}`
    }
    return `+62 ${local.slice(1)}`
  }
  return `+${digits}`
}