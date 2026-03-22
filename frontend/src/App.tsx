import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useQuery } from 'react-query'
import { waApi, type WAStatus, api } from './lib/api'
import Dashboard from './pages/Dashboard'
import NewBroadcast from './pages/NewBroadcast'
import History from './pages/History'
import BroadcastDetail from './pages/BroadcastDetail'
import WASetup from './pages/WASetup'
import Login from './pages/Login'
import {
  LayoutGrid, Send, Clock, Wifi, WifiOff, Loader2, MessageSquare, Sun, Moon, LogOut
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

export default function App() {
  const { theme, toggle } = useTheme()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

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
        if (err.response?.status === 401) {
          handleLogout()
        }
        return Promise.reject(err)
      }
    )
    return () => api.interceptors.response.eject(interceptor)
  }, [])

  const { data } = useQuery(
    ['wa-status', token],
    () => waApi.status().then(r => r.data?.status ?? 'disconnected'),
    { refetchInterval: 8000, enabled: !!token }
  )
  const status: WAStatus = data ?? 'disconnected'

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Mobile top header */}
      <MobileHeader theme={theme} onToggleTheme={toggle} status={status} onLogout={handleLogout} />

      {/* Desktop layout */}
      <div className="flex flex-1 md:flex-row pb-16 md:pb-0">
        <DesktopSidebar status={status} theme={theme} onToggleTheme={toggle} onLogout={handleLogout} />
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

      {/* Mobile bottom nav */}
      <MobileBottomNav status={status} />
    </div>
  )
}

/* ── Mobile top bar ─────────────────────────────────────────── */
function MobileHeader({ theme, onToggleTheme, status, onLogout }: {
  theme: Theme; onToggleTheme: () => void; status: WAStatus; onLogout: () => void
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
  const title = isDetail ? 'Detail Broadcast' : (pageTitle[location.pathname] ?? 'MediBlast')

  const statusColor = { connected: '#25d366', waiting_qr: '#f59e0b', disconnected: '#ef4444' }[status]

  return (
    <header className="md:hidden glass sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
      style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Logo mark */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
        <MessageSquare size={13} color="white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{title}</div>
      </div>

      {/* WA status dot */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
        <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>
          {status === 'connected' ? 'WA' : status === 'waiting_qr' ? 'Scan' : 'Putus'}
        </span>
      </div>

      {/* Theme toggle */}
      <button onClick={onToggleTheme}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
        title={isDark ? 'Mode terang' : 'Mode gelap'}>
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {/* Logout button */}
      <button onClick={onLogout}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-red-500 hover:bg-red-50"
        style={{ background: 'var(--surface-2)' }}
        title="Logout">
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
  const statusColor = { connected: '#25d366', waiting_qr: '#f59e0b', disconnected: '#ef4444' }[status]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass flex"
      style={{ borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {navItems.map(({ to, icon: NavIcon, label }) => (
        <NavLink key={to} to={to} end={to === '/'}
          className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-medium transition-colors relative"
          style={({ isActive }) => ({ color: isActive ? '#25d366' : 'var(--text-2)' })}>
          {({ isActive }) => (
            <>
              {/* Active pill */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#25d366]" />
              )}
              {/* WA status dot on setup icon */}
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
function DesktopSidebar({ status, theme, onToggleTheme, onLogout }: {
  status: WAStatus; theme: Theme; onToggleTheme: () => void; onLogout: () => void
}) {
  const navItems = [
    { to: '/', icon: LayoutGrid, label: 'Dashboard' },
    { to: '/new', icon: Send, label: 'Broadcast Baru' },
    { to: '/history', icon: Clock, label: 'Riwayat' },
    { to: '/setup', icon: MessageSquare, label: 'Pengaturan WA' },
  ]
  const statusConfig = {
    connected:    { color: '#25d366', label: 'Terhubung', Icon: Wifi },
    waiting_qr:   { color: '#f59e0b', label: 'Scan QR',   Icon: Loader2 },
    disconnected: { color: '#ef4444', label: 'Terputus',  Icon: WifiOff },
  }
  const { color, label, Icon } = statusConfig[status]
  const isDark = theme === 'dark'

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen glass sticky top-0"
      style={{ borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }}>
            <MessageSquare size={16} color="white" />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>MediBlast</div>
            <div className="text-[11px]" style={{ color: 'var(--text-2)' }}>Pengingat Pasien</div>
          </div>
        </div>
        <button onClick={onToggleTheme}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
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

      {/* WA Status & Logout */}
      <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="glass-2 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="relative">
            <Icon size={15} color={color} className={status === 'waiting_qr' ? 'animate-spin' : ''} />
            {status === 'connected' && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" />
            )}
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color }}>WhatsApp</div>
            <div className="text-[11px]" style={{ color: 'var(--text-2)' }}>{label}</div>
          </div>
        </div>

        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
          style={{ background: 'var(--surface-2)' }}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  )
}