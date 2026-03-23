import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { broadcastApi } from '../lib/api'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, Ban, CheckCircle2, XCircle, Phone, RefreshCw, User, Clock, Calendar } from 'lucide-react'

const TZ = 'Asia/Makassar'
function safeDate(v: string | null | undefined): Date | null {
  if (!v) return null
  try { const d = toZonedTime(parseISO(v), TZ); return isNaN(d.getTime()) ? null : d } catch { return null }
}
function fmt(v: string | null | undefined, p: string, fb = '—'): string {
  const d = safeDate(v); return d ? format(d, p, { locale: id }) : fb
}

export default function BroadcastDetail() {
  const { id: paramId } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()

  const { data: broadcast, isLoading } = useQuery(
    ['broadcast', paramId],
    () => broadcastApi.get(Number(paramId)).then(r => r.data),
    { refetchInterval: b => (b?.status === 'sending' ? 3000 : false) }
  )

  const { data: logs = [] } = useQuery(
    ['logs', paramId],
    () => broadcastApi.logs(Number(paramId)).then(r => Array.isArray(r.data) ? r.data : []),
    { enabled: !!paramId, refetchInterval: () => (broadcast?.status === 'sending' ? 3000 : false) }
  )

  const cancelMutation = useMutation(
    () => broadcastApi.cancel(Number(paramId)),
    {
      onSuccess: () => {
        toast.success('Broadcast dibatalkan')
        qc.invalidateQueries(['broadcast', paramId])
        qc.invalidateQueries('broadcasts')
      },
      onError: () => { toast.error('Gagal membatalkan') },
    }
  )

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center">
      <RefreshCw size={20} className="animate-spin text-[#25d366]" />
    </div>
  )
  if (!broadcast) return <div className="p-8 text-center" style={{ color: 'var(--text-2)' }}>Broadcast tidak ditemukan.</div>

  const successRate = broadcast.total_count > 0 ? Math.round((broadcast.sent_count / broadcast.total_count) * 100) : 0
  const canCancel = ['pending', 'sending'].includes(broadcast.status)

  const statusLabel: Record<string, string> = {
    pending: 'Menunggu', sending: 'Mengirim', completed: 'Selesai', failed: 'Gagal', cancelled: 'Dibatalkan'
  }

  return (
    <div className="p-4 md:p-8 pb-safe max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => nav(-1)} className="p-2 glass-2 rounded-xl transition-colors" style={{ color: 'var(--text-2)' }}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold truncate" style={{ color: 'var(--text)' }}>{broadcast.name}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{broadcast.excel_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={broadcastApi.downloadUrl(Number(paramId))}
            className="p-2 glass-2 rounded-xl transition-colors" style={{ color: 'var(--text-2)' }} title="Unduh Excel">
            <Download size={16} />
          </a>
          {canCancel && (
            <button onClick={() => { if (confirm('Batalkan broadcast ini?')) cancelMutation.mutate() }}
              className="p-2 glass-2 rounded-xl transition-colors hover:text-red-400" style={{ color: 'var(--text-2)' }}>
              <Ban size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="glass rounded-2xl p-5">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Stat label="Total" value={broadcast.total_count} color="var(--text)" />
          <Stat label="Terkirim" value={broadcast.sent_count} color="#25d366" />
          <Stat label="Gagal" value={broadcast.failed_count} color="#f87171" />
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${successRate}%`, background: 'linear-gradient(90deg,#25d366,#128c7e)' }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px]" style={{ color: 'var(--text-2)' }}>
          <span>{successRate}% berhasil</span>
          <span>
            {broadcast.last_sent_at ? `Terakhir dikirim ${fmt(broadcast.last_sent_at, 'dd MMM, HH:mm')}`
              : broadcast.scheduled_at ? `Dijadwalkan ${fmt(broadcast.scheduled_at, 'dd MMM, HH:mm')}`
              : `Cron: ${broadcast.cron_expr}`}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Detail</h2>
        <DetailRow icon={<Clock size={14} />} label="Jadwal">
          {broadcast.schedule_type === 'once'
            ? fmt(broadcast.scheduled_at, 'EEEE, dd MMM yyyy HH:mm')
            : `Berulang · ${broadcast.cron_expr}`}
        </DetailRow>
        <DetailRow icon={<User size={14} />} label="Pasien">{broadcast.total_count} pasien</DetailRow>
        <DetailRow icon={<Calendar size={14} />} label="Status">{statusLabel[broadcast.status] ?? broadcast.status}</DetailRow>
        <DetailRow icon={<Calendar size={14} />} label="Dibuat">{fmt(broadcast.created_at, 'dd MMM yyyy, HH:mm')}</DetailRow>
      </div>

      {/* Logs */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Log Pengiriman
          <span className="ml-2 text-[11px] font-normal" style={{ color: 'var(--text-2)' }}>({logs.length})</span>
        </h2>
        {logs.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm" style={{ color: 'var(--text-2)' }}>
            Belum ada pesan terkirim
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.map(log => (
              <div key={log.id} className="glass-2 rounded-xl px-4 py-3 flex items-center gap-3">
                {log.status === 'sent'
                  ? <CheckCircle2 size={15} className="text-[#25d366] shrink-0" />
                  : <XCircle size={15} className="text-red-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{log.patient_name}</div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                    <Phone size={10} /><span>{log.phone}</span>
                    {log.error && <span className="text-red-400 truncate">· {log.error}</span>}
                  </div>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--text-2)' }}>{fmt(log.sent_at, 'HH:mm')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{label}</div>
    </div>
  )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span style={{ color: 'var(--text-2)' }}>{icon}</span>
      <span className="w-20 shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <span style={{ color: 'var(--text)' }}>{children}</span>
    </div>
  )
}