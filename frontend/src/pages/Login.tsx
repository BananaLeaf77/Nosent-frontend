import { useState } from 'react'
import { MessagesSquare, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authApi } from '../lib/api'
import toast from 'react-hot-toast'

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(username, password)
      toast.success('Login berhasil')
      onLogin(res.data.token)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)', boxShadow: '0 8px 32px rgba(37,211,102,0.3)' }}>
            <MessagesSquare size={32} color="white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Nosent</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Login untuk mengelola sistem</p>
        </div>

        {/* Card */}
        <div className="glass-2 rounded-2xl p-6 sm:p-8" style={{ border: '1px solid var(--border)' }}>
          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-1">
              <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-2)' }}>Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User size={18} style={{ color: 'var(--text-2)' }} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all focus:outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium ml-1" style={{ color: 'var(--text-2)' }}>Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={18} style={{ color: 'var(--text-2)' }} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm transition-all focus:outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center hover:opacity-75 transition-opacity"
                  style={{ color: 'var(--text-2)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: '#25d366' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Login'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
