'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function CentralLayout({ children }: { children: React.ReactNode }) {
  const { webUser, user, loading } = useAuth()

  // Show loading spinner only during initial auth check
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  // If not logged in, middleware will handle redirect - just show nothing briefly
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">Đang chuyển hướng...</p>
      </div>
    )
  }

  const role = webUser?.role || 'central_admin'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-slate-900 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
