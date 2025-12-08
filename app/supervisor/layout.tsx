'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const { webUser, user, loading } = useAuth()

  // Show loading spinner only during initial auth check
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // If not logged in, middleware will handle redirect
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Đang chuyển hướng...</p>
      </div>
    )
  }

  const role = webUser?.role || 'commune_supervisor'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
