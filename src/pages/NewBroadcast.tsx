import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { broadcastApi, waApi, type WAStatus } from '../lib/api'
import toast from 'react-hot-toast'
import { Upload, FileSpreadsheet, X, Info, Send, RefreshCw, Download, AlertTriangle } from 'lucide-react'

const DEFAULT_TEMPLATE = `Halo {{name}} 👋

Mengingatkan bahwa Anda memiliki jadwal kontrol kehamilan ke-*{{pregnancy_number}}*.

HPHT: *{{hpht}}*
Alamat: {{address}}

Mohon hadir tepat waktu. Jika perlu mengubah jadwal, silakan hubungi kami.

Terima kasih 🙏`

const CRON_PRESETS = [
  { label: 'Setiap tgl 1 jam 08.00', value: '0 0 8 1 * *' },
  { label: 'Setiap Senin jam 09.00', value: '0 0 9 * * 1' },
  { label: 'Setiap hari jam 08.00',  value: '0 0 8 * * *' },
  { label: 'Setiap hari kerja 07.00',value: '0 0 7 * * 1-5' },
]

export default function NewBroadcast() {
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [scheduleType, setScheduleType] = useState<'once' | 'recurring'>('once')
  const [scheduledAt, setScheduledAt] = useState('')
  const [cronExpr, setCronExpr] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // Poll WA status so the button disables/enables live
  const { data: waStatusData } = useQuery(
    'wa-status-new',
    () => waApi.status().then(r => r.data?.status ?? 'disconnected'),
    { refetchInterval: 8000 }
  )
  const waStatus: WAStatus = (waStatusData as WAStatus) ?? 'disconnected'
  const waConnected = waStatus === 'connected'

  const mutation = useMutation(
    (form: FormData) => broadcastApi.create(form).then(r => r.data),
    {
      onSuccess: (data: any) => {
        toast.success('Broadcast berhasil dijadwalkan!')
        const id = data.id ?? data.ID
        nav(`/history/${id}`)
      },
      onError: (err: any): void => {
        toast.error(err.response?.data?.message || 'Gagal membuat broadcast')
      },
    }
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setFile(f)
    else toast.error('Hanya file .xlsx atau .xls yang diizinkan')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!waConnected) {
      toast.error('WhatsApp belum terhubung. Hubungkan dulu di Pengaturan WA.')
      return
    }
    if (!file) { toast.error('Silakan upload file Excel'); return }
    if (!name.trim()) { toast.error('Nama broadcast wajib diisi'); return }
    if (scheduleType === 'once' && (!scheduledAt || !scheduledAt.includes('T') || scheduledAt.endsWith('T'))) {
      toast.error('Silakan atur tanggal dan waktu'); return
    }
    if (scheduleType === 'recurring' && !cronExpr) { toast.error('Silakan atur jadwal berulang'); return }

    const form = new FormData()
    form.append('excel', file)
    form.append('name', name)
    form.append('message_tpl', template)
    form.append('schedule_type', scheduleType)
    if (scheduleType === 'once') form.append('scheduled_at', new Date(scheduledAt).toISOString())
    else form.append('cron_expr', cronExpr)
    mutation.mutate(form)
  }

  const placeholders = ['{{name}}', '{{phone}}', '{{address}}', '{{hpht}}', '{{pregnancy_number}}']

  const submitDisabled = mutation.isLoading || !waConnected

  return (
    <div className="p-4 md:p-8 pb-safe max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Broadcast Baru</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Upload data pasien dan jadwalkan pengingat</p>
      </div>

      {/* WA disconnected banner */}
      {!waConnected && (
        <Link to="/setup"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-5 transition-colors"
          style={{ background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertTriangle size={17} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-amber-400">WhatsApp belum terhubung</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
              {waStatus === 'waiting_qr'
                ? 'Scan QR code di Pengaturan WA terlebih dahulu →'
                : 'Hubungkan WhatsApp di Pengaturan WA untuk bisa mengirim broadcast →'}
            </div>
          </div>
        </Link>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Nama */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            Nama Broadcast
          </label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="cth. Pengingat Kontrol Juni"
            className="input-base" />
        </div>

        {/* File Excel */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            File Excel Pasien
          </label>
          {file ? (
            <div className="flex items-center gap-3 glass-2 rounded-xl px-4 py-3">
              <FileSpreadsheet size={18} className="text-[#25d366] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{file.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-2)' }}>{(file.size / 1024).toFixed(1)} KB</div>
              </div>
              <button type="button" onClick={() => setFile(null)} style={{ color: 'var(--text-2)' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{ borderColor: dragOver ? '#25d366' : 'var(--input-border)', background: dragOver ? 'rgba(37,211,102,0.05)' : 'transparent' }}
            >
              <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--text-2)' }} />
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Letakkan file Excel di sini</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>atau klik untuk pilih · .xlsx, .xls</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }} />
            </div>
          )}

          <div className="mt-3 glass-2 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <Info size={13} className="text-[#25d366] mt-0.5 shrink-0" />
            <div className="text-xs flex-1" style={{ color: 'var(--text-2)' }}>
              Kolom wajib: <span style={{ color: 'var(--text)' }}>Nama Pasien, No Telp</span>.
              Opsional: Alamat, HPHT, Hamil Ke-.
            </div>
            <a href="/template_pasien.xlsx" download="template_pasien.xlsx"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white shrink-0 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
              <Download size={11} /> Download Template
            </a>
          </div>
        </div>

        {/* Template Pesan */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            Template Pesan
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {placeholders.map(p => (
              <button key={p} type="button" onClick={() => setTemplate(t => t + p)}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 transition-colors">
                {p}
              </button>
            ))}
          </div>
          <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={8}
            className="input-base resize-none leading-relaxed" />
          <p className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>
            Klik placeholder di atas untuk menyisipkan. WhatsApp mendukung *tebal*, _miring_, ~coret~.
          </p>
        </div>

        {/* Jadwal */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>
            Jadwal Pengiriman
          </label>
          <div className="flex gap-2 mb-4">
            {(['once', 'recurring'] as const).map(t => (
              <button key={t} type="button" onClick={() => setScheduleType(t)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                style={scheduleType === t
                  ? { background: 'linear-gradient(135deg,#25d366,#128c7e)', color: 'white' }
                  : { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                {t === 'once' ? 'Sekali Kirim' : 'Berulang'}
              </button>
            ))}
          </div>

          {scheduleType === 'once' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>Tanggal</label>
                <input type="date"
                  value={scheduledAt.split('T')[0] || ''}
                  onChange={e => setScheduledAt(prev => e.target.value + 'T' + (prev.split('T')[1] || '08:00'))}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>Jam</label>
                <input type="time"
                  value={scheduledAt.split('T')[1] || ''}
                  onChange={e => setScheduledAt(prev => (prev.split('T')[0] || '') + 'T' + e.target.value)}
                  className="input-base" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>Ekspresi Cron</label>
                <input type="text" value={cronExpr} onChange={e => setCronExpr(e.target.value)}
                  placeholder="0 0 8 1 * *"
                  className="input-base font-mono" />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>Atau pilih preset</label>
                <div className="space-y-1.5">
                  {CRON_PRESETS.map(p => (
                    <button key={p.value} type="button" onClick={() => setCronExpr(p.value)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between"
                      style={cronExpr === p.value
                        ? { background: 'rgba(37,211,102,0.1)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)' }
                        : { background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                      <span>{p.label}</span>
                      <code className="font-mono text-[10px] opacity-60">{p.value}</code>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="space-y-2">
          <button
            type="submit"
            disabled={submitDisabled}
            title={!waConnected ? 'Hubungkan WhatsApp terlebih dahulu' : ''}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            style={submitDisabled
              ? { background: 'var(--surface-2)', color: 'var(--text-2)', cursor: 'not-allowed', border: '1px solid var(--border)' }
              : { background: 'linear-gradient(135deg,#25d366,#128c7e)', opacity: 1 }
            }>
            {mutation.isLoading
              ? <><RefreshCw size={16} className="animate-spin" /> Menjadwalkan…</>
              : !waConnected
              ? <><AlertTriangle size={16} /> WhatsApp Tidak Terhubung</>
              : <><Send size={16} /> Jadwalkan Broadcast</>
            }
          </button>

          {!waConnected && (
            <p className="text-center text-xs" style={{ color: 'var(--text-2)' }}>
              <Link to="/setup" className="text-amber-400 hover:underline">Buka Pengaturan WA</Link> untuk menghubungkan WhatsApp
            </p>
          )}
        </div>
      </form>
    </div>
  )
}