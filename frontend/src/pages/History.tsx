import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { broadcastApi, type BroadcastSummary } from '../lib/api'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { ArrowRight, Clock, RefreshCw, CheckCircle2, XCircle, Ban, Send, Loader2 } from 'lucide-react'

const TZ = 'Asia/Makassar'
function safeDate(v: string | null | undefined): Date | null {
  if (!v) return null
  try { const d = toZonedTime(parseISO(v), TZ); return isNaN(d.getTime()) ? null : d } catch { return null }
}
function fmt(v: string | null | undefined, p: string, fb = '—') {
  const d = safeDate(v); return d ? format(d, p, { locale: id }) : fb
}
function fmtAgo(v: string | null | undefined) {
  const d = safeDate(v); return d ? formatDistanceToNow(d, { addSuffix: true, locale: id }) : '—'
}

const STATUS_CONFIG = {
  pending:   { icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Menunggu'   },
  sending:   { icon: Loader2,      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  label: 'Mengirim'   },
  completed: { icon: CheckCircle2, color: '#25d366', bg: 'rgba(37,211,102,0.1)', label: 'Selesai'    },
  failed:    { icon: XCircle,      color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Gagal'      },
  cancelled: { icon: Ban,          color: '#6b7fa3', bg: 'rgba(107,127,163,0.1)', label: 'Dibatalkan' },
} as const

export default function History() {
  const { data: broadcasts = [], isLoading, refetch } = useQuery(
    'broadcasts',
    () => broadcastApi.list().then(r => Array.isArray(r.data) ? r.data : []),
    { refetchInterval: 15_000 }
  )

  return (
    <div className="p-4 md:p-8 pb-safe max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Riwayat</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{broadcasts.length} broadcast total</p>
        </div>
        <button onClick={() => refetch()} className="p-2 glass-2 rounded-xl transition-colors" style={{ color: 'var(--text-2)' }}>
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Send size={28} className="mx-auto mb-3" style={{ color: 'var(--text-2)' }} />
          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Belum ada broadcast</div>
          <Link to="/new" className="text-xs text-[#25d366] hover:underline mt-1 inline-block">
            Buat broadcast pertama →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map(b => <BroadcastCard key={b.id} b={b} fmt={fmt} fmtAgo={fmtAgo} />)}
        </div>
      )}
    </div>
  )
}

function BroadcastCard({ b, fmt, fmtAgo }: { b: BroadcastSummary; fmt: Function; fmtAgo: Function }) {
  const s = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending
  const Icon = s.icon
  const successRate = b.total_count > 0 ? Math.round((b.sent_count / b.total_count) * 100) : 0

  return (
    <Link to={`/history/${b.id}`} className="glass rounded-2xl px-5 py-4 flex items-center gap-4 transition-all group block">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: s.bg }}>
        <Icon size={17} style={{ color: s.color }} className={b.status === 'sending' ? 'animate-spin' : ''} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate group-hover:text-[#25d366] transition-colors" style={{ color: 'var(--text)' }}>
            {b.name}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
            style={{ background: s.bg, color: s.color }}>{s.label}</span>
        </div>

        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-2)' }}>
          <span>{b.total_count} pasien</span>
          {b.status === 'completed' && (
            <><span>·</span>
            <span className="text-[#25d366]">{b.sent_count} terkirim</span>
            {b.failed_count > 0 && <><span>·</span><span className="text-red-400">{b.failed_count} gagal</span></>}
            </>
          )}
          <span>·</span>
          <span>
            {b.last_sent_at ? fmtAgo(b.last_sent_at)
              : b.scheduled_at ? fmt(b.scheduled_at, 'dd MMM, HH:mm')
              : b.cron_expr ? `Berulang (${b.cron_expr})`
              : fmt(b.created_at, 'dd MMM')}
          </span>
        </div>

        {b.status === 'completed' && b.total_count > 0 && (
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${successRate}%`, background: successRate > 80 ? 'linear-gradient(90deg,#25d366,#128c7e)' : 'linear-gradient(90deg,#f59e0b,#d97706)' }} />
          </div>
        )}
      </div>
      <ArrowRight size={14} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#25d366]" />
    </Link>
  )
}