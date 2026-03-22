import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'react-query'
import { QRCodeSVG } from 'qrcode.react'
import { waApi } from '../lib/api'
import toast from 'react-hot-toast'
import { CheckCircle2, RefreshCw, LogOut, Smartphone, Wifi, WifiOff, AlertCircle } from 'lucide-react'

export default function WASetup() {
  const [qr, setQr] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)

  const { data: statusData, refetch: refetchStatus } = useQuery(
    'wa-status-page',
    () => waApi.status().then(r => r.data),
    { refetchInterval: 4000 }
  )
  const status = statusData?.status ?? 'disconnected'

  useQuery('wa-qr', () => waApi.qr().then(r => r.data), {
    enabled: status === 'waiting_qr',
    refetchInterval: 4000,
    onSuccess: (data) => { if (data.qr) setQr(data.qr) },
  })

  const logoutMutation = useMutation(
    () => waApi.logout(),
    {
      onSuccess: () => {
        toast.success('Berhasil keluar. Menghubungkan ulang…')
        setQr(null)
        setTimeout(() => refetchStatus(), 2000)
      },
      onError: () => { toast.error('Gagal keluar') },
    }
  )

  const handleReconnect = async () => {
    setReconnecting(true); setQr(null)
    try {
      await waApi.reconnect()
      toast.success('Menghubungkan… QR code akan muncul sebentar lagi')
      setTimeout(() => { refetchStatus(); setReconnecting(false) }, 3000)
    } catch {
      toast.error('Gagal menghubungkan')
      setReconnecting(false)
    }
  }

  useEffect(() => { if (status === 'connected') setQr(null) }, [status])

  return (
    <div className="p-4 md:p-8 pb-safe max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Pengaturan WhatsApp</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
          Hubungkan akun WhatsApp untuk mengaktifkan broadcast
        </p>
      </div>

      {/* Status card */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: status === 'connected' ? 'rgba(37,211,102,0.15)' : status === 'waiting_qr' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }}>
            {status === 'connected' ? <Wifi size={22} color="#25d366" />
              : status === 'waiting_qr' ? <Smartphone size={22} color="#f59e0b" />
              : <WifiOff size={22} color="#f87171" />}
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold"
              style={{ color: status === 'connected' ? '#25d366' : status === 'waiting_qr' ? '#f59e0b' : '#f87171' }}>
              {status === 'connected' ? 'Terhubung' : status === 'waiting_qr' ? 'Menunggu Scan QR' : 'Tidak Terhubung'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
              {status === 'connected' ? 'WhatsApp Anda terhubung dan siap mengirim pesan'
                : status === 'waiting_qr' ? 'Buka WhatsApp di HP Anda dan scan QR code di bawah'
                : 'Klik "Tampilkan QR" untuk generate QR code'}
            </div>
          </div>
          {status === 'disconnected' && (
            <button onClick={handleReconnect} disabled={reconnecting}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
              <RefreshCw size={13} className={reconnecting ? 'animate-spin' : ''} />
              {reconnecting ? 'Memuat…' : 'Tampilkan QR'}
            </button>
          )}
        </div>

        {status === 'connected' && (
          <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 text-xs text-[#25d366]">
              <CheckCircle2 size={13} /><span>Siap mengirim broadcast</span>
            </div>
            <button
              onClick={() => { if (confirm('Putuskan WhatsApp? Anda perlu scan QR lagi.')) logoutMutation.mutate() }}
              disabled={logoutMutation.isLoading}
              className="flex items-center gap-1.5 text-xs hover:text-red-400 transition-colors"
              style={{ color: 'var(--text-2)' }}>
              <LogOut size={12} /> Putuskan
            </button>
          </div>
        )}
      </div>

      {/* QR Code */}
      {status !== 'connected' && (
        <div className="glass rounded-2xl p-6 text-center">
          {qr ? (
            <div className="space-y-4">
              <div className="p-3 bg-white rounded-2xl inline-block">
                <QRCodeSVG value={qr} size={220} level="M" includeMargin={false} />
              </div>
              <div className="text-xs" style={{ color: 'var(--text-2)' }}>QR diperbarui otomatis setiap 20 detik</div>
            </div>
          ) : status === 'waiting_qr' ? (
            <div className="py-8 space-y-3">
              <RefreshCw size={28} className="mx-auto animate-spin" style={{ color: 'var(--text-2)' }} />
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>Memuat QR code…</div>
            </div>
          ) : (
            <div className="py-8 space-y-3">
              <WifiOff size={28} className="mx-auto" style={{ color: 'var(--text-2)' }} />
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>Klik "Tampilkan QR" di atas untuk memulai</div>
            </div>
          )}
        </div>
      )}

      {/* Cara menghubungkan */}
      <div className="mt-5 glass rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>Cara Menghubungkan</h2>
        {[
          'Klik tombol "Tampilkan QR" di atas',
          'Buka WhatsApp di HP Anda',
          'Ketuk menu titik tiga (⋮) → Perangkat Tertaut',
          'Ketuk "Tautkan Perangkat" lalu scan QR code',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[#25d366]"
              style={{ background: 'rgba(37,211,102,0.15)' }}>{i + 1}</div>
            <span className="text-sm" style={{ color: 'var(--text)' }}>{step}</span>
          </div>
        ))}
      </div>

      {/* Peringatan */}
      <div className="mt-3 glass-2 rounded-xl p-3.5 flex items-start gap-2.5">
        <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          Jaga server tetap berjalan untuk mempertahankan koneksi. WhatsApp dapat terputus setelah 14 hari tidak aktif — cukup scan ulang QR untuk terhubung kembali.
        </p>
      </div>
    </div>
  )
}