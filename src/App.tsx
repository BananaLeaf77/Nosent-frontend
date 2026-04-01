import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from 'react-query'
import { waApi, type WAStatus, type WAMe, formatWAPhone, api } from './lib/api'
import Dashboard from './pages/Dashboard'
import NewBroadcast from './pages/NewBroadcast'
import History from './pages/History'
import BroadcastDetail from './pages/BroadcastDetail'
import WASetup from './pages/WASetup'
import Login from './pages/Login'
import {
  LayoutGrid, Send, Clock, Wifi, WifiOff, Loader2, MessageSquare, Sun, Moon, LogOut,
  User, Smartphone,
} from 'lucide-react'

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'dark'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}

/** Decode JWT payload without verifying signature (client-side only) */
function getJWTUsername(): string {
  try {
    const token = localStorage.getItem('token') ?? ''
    const payload = JSON.parse(atob(token.split('.')[1]))
    return (payload.sub as string) ?? ''
  } catch {
    return ''
  }
}

export default function App() {
  const { theme, toggle } = useTheme()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const username = token ? getJWTUsername() : ''

  const handleLogin = (t: string) => {
    localStorage.setItem('token', t)
    setToken(t)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) handleLogout()
        return Promise.reject(err)
      }
    )
    return () => api.interceptors.response.eject(interceptor)
  }, [])

  const { data: statusData } = useQuery(
    ['wa-status', token],
    () => waApi.status().then(r => r.data?.status ?? 'disconnected'),
    { refetchInterval: 8000, enabled: !!token }
  )
  const status: WAStatus = statusData ?? 'disconnected'

  const { data: waMe } = useQuery(
    ['wa-me', token],
    () => waApi.me().then(r => r.data),
    { refetchInterval: 10000, enabled: !!token }
  )

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <MobileHeader theme={theme} onToggleTheme={toggle} status={status} onLogout={handleLogout} username={username} />

      <div className="flex flex-1 md:flex-row pb-16 md:pb-0">
        <DesktopSidebar
          status={status}
          theme={theme}
          onToggleTheme={toggle}
          onLogout={handleLogout}
          username={username}
          waMe={waMe}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Routes>
            <Route path="/" element={<Dashboard status={status} />} />
            <Route path="/new" element={<NewBroadcast />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<BroadcastDetail />} />
            <Route path="/setup" element={<WASetup />} />
          </Routes>
        </main>
      </div>

      <MobileBottomNav status={status} />
    </div>
  )
}

/* ── Mobile top bar ─────────────────────────────────────────── */
function MobileHeader({ theme, onToggleTheme, status, onLogout, username }: {
  theme: Theme; onToggleTheme: () => void; status: WAStatus; onLogout: () => void; username: string
}) {
  const location = useLocation()
  const isDark = theme === 'dark'

  const pageTitle: Record<string, string> = {
    '/': 'Dashboard',
    '/new': 'Broadcast Baru',
    '/history': 'Riwayat',
    '/setup': 'Pengaturan WA',
  }
  const isDetail = location.pathname.startsWith('/history/') && location.pathname !== '/history'
  const title = isDetail ? 'Detail Broadcast' : (pageTitle[location.pathname] ?? 'Nosent')

  const statusColor = {
    connected: '#25d366',
    waiting_qr: '#f59e0b',
    disconnected: '#ef4444',
  }[status]

  const statusLabel = {
    connected: 'WA',
    waiting_qr: 'Scan',
    disconnected: 'Putus',
  }[status]

  return (
    <header className="md:hidden glass sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
        <MessageSquare size={13} color="white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{title}</div>
        {username && (
          <div className="text-[10px] truncate" style={{ color: 'var(--text-2)' }}>{username}</div>
        )}
      </div>

      {/* WA status indicator */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor }} />
        <span className="text-[11px]" style={{ color: statusColor }}>{statusLabel}</span>
      </div>

      <button onClick={onToggleTheme}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <button onClick={onLogout}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: 'var(--surface-2)', color: '#ef4444' }}>
        <LogOut size={15} />
      </button>
    </header>
  )
}

/* ── Mobile bottom nav ──────────────────────────────────────── */
function MobileBottomNav({ status }: { status: WAStatus }) {
  const navItems = [
    { to: '/', icon: LayoutGrid, label: 'Dashboard' },
    { to: '/new', icon: Send, label: 'Baru' },
    { to: '/history', icon: Clock, label: 'Riwayat' },
    { to: '/setup', icon: MessageSquare, label: 'WA' },
  ]

  const statusColor = {
    connected: '#25d366',
    waiting_qr: '#f59e0b',
    disconnected: '#ef4444',
  }[status]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass flex"
      style={{ borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {navItems.map(({ to, icon: NavIcon, label }) => (
        <NavLink key={to} to={to} end={to === '/'}
          className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium transition-colors relative"
          style={({ isActive }) => ({ color: isActive ? '#25d366' : 'var(--text-2)' })}>
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#25d366]" />
              )}
              <span className="relative">
                <NavIcon size={21} />
                {to === '/setup' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--bg)]"
                    style={{ background: statusColor }} />
                )}
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/* ── Desktop sidebar ────────────────────────────────────────── */
function DesktopSidebar({ status, theme, onToggleTheme, onLogout, username, waMe }: {
  status: WAStatus
  theme: Theme
  onToggleTheme: () => void
  onLogout: () => void
  username: string
  waMe?: WAMe
}) {
  const navItems = [
    { to: '/', icon: LayoutGrid, label: 'Dashboard' },
    { to: '/new', icon: Send, label: 'Broadcast Baru' },
    { to: '/history', icon: Clock, label: 'Riwayat' },
    { to: '/setup', icon: MessageSquare, label: 'Pengaturan WA' },
  ]

  const isDark = theme === 'dark'

  // Status config — always shows a meaningful state
  const statusConfig: Record<WAStatus, { color: string; label: string; sublabel: string; Icon: typeof Wifi; spin: boolean }> = {
    connected: {
      color: '#25d366',
      label: 'Terhubung',
      sublabel: waMe?.phone ? formatWAPhone(waMe.phone) : 'WhatsApp aktif',
      Icon: Wifi,
      spin: false,
    },
    waiting_qr: {
      color: '#f59e0b',
      label: 'Menunggu QR',
      sublabel: 'Scan QR di Pengaturan WA',
      Icon: Loader2,
      spin: true,
    },
    disconnected: {
      color: '#ef4444',
      label: 'Tidak Terhubung',
      sublabel: 'Buka Pengaturan WA',
      Icon: WifiOff,
      spin: false,
    },
  }

  const sc = statusConfig[status]

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen glass sticky top-0"
      style={{ borderRight: '1px solid var(--border)' }}>

      {/* Logo + theme toggle */}
      <div className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
            <MessageSquare size={16} color="white" />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Nosent</div>
            <div className="text-[11px]" style={{ color: 'var(--text-2)' }}>Pengingat Pasien</div>
          </div>
        </div>
        <button onClick={onToggleTheme}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* Profile card */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="glass-2 rounded-xl px-3 py-3 flex items-center gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm"
            style={{
              background: 'linear-gradient(135deg,rgba(37,211,102,0.2),rgba(18,140,126,0.2))',
              color: '#25d366',
              border: '1px solid rgba(37,211,102,0.3)',
            }}>
            {username ? username[0].toUpperCase() : <User size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {username || 'Admin'}
            </div>
            {/* WA number under name */}
            {status === 'connected' && waMe?.phone ? (
              <div className="flex items-center gap-1 text-[10px] truncate" style={{ color: '#25d366' }}>
                <Smartphone size={9} />
                <span>{formatWAPhone(waMe.phone)}</span>
              </div>
            ) : (
              <div className="text-[10px] truncate" style={{ color: 'var(--text-2)' }}>
                {status === 'waiting_qr' ? 'Menunggu scan QR…' : 'WA belum terhubung'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: NavIcon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'glow-green' : ''}`
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(37,211,102,0.10)' : 'transparent',
              color: isActive ? '#25d366' : 'var(--text-2)',
            })}>
            <NavIcon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* WA Status + Logout */}
      <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Status card — always visible, color-coded by state */}
        <NavLink to="/setup"
          className="glass-2 rounded-xl px-3 py-2.5 flex items-center gap-2.5 transition-opacity hover:opacity-80 block"
          style={{ textDecoration: 'none' }}>
          <div className="relative shrink-0">
            <sc.Icon
              size={15}
              color={sc.color}
              className={sc.spin ? 'animate-spin' : ''}
            />
            {status === 'connected' && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium leading-tight" style={{ color: sc.color }}>
              {sc.label}
            </div>
            <div className="text-[10px] truncate leading-tight mt-0.5" style={{ color: 'var(--text-2)' }}>
              {sc.sublabel}
            </div>
          </div>
        </NavLink>

        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors"
          style={{ background: 'var(--surface-2)', color: '#ef4444' }}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  )
}