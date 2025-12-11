'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { webUser, error } = await signIn(email, password)

      if (error) {
        setError(error.message)
      } else if (webUser) {
        // Redirect based on user role
        const roleRoutes: Record<string, string> = {
          commune_officer: '/commune/dashboard',
          commune_supervisor: '/supervisor/dashboard',
          central_admin: '/central/dashboard',
          system_admin: '/central/dashboard',
        }

        const targetRoute = roleRoutes[webUser.role] || '/commune/dashboard'
        router.push(targetRoute)
        router.refresh()
      }
    } catch {
      setError('Đã xảy ra lỗi không mong muốn')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      {/* Card with glassmorphism */}
      <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-transparent to-yellow-500/20 rounded-2xl blur-xl opacity-50" />

        <div className="relative">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Đăng nhập</h2>
            <p className="text-sm text-slate-400">
              Nhập thông tin để truy cập hệ thống
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="ten@donvi.gov.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Đăng nhập</span>
                </>
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <a
                href="/reset-password"
                className="text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                Quên mật khẩu?
              </a>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-transparent text-slate-500">Hỗ trợ kỹ thuật</span>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-xs text-slate-500">
            Liên hệ quản trị viên nếu bạn gặp vấn đề đăng nhập
          </p>
        </div>
      </div>
    </div>
  )
}
