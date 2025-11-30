'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CommuneLayout({ children }: { children: React.ReactNode }) {
  const { webUser, loading, initialized, user, refreshWebUser } = useAuth()
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  // Redirect to login if not authenticated after initialization
  useEffect(() => {
    if (initialized && !user) {
      router.replace('/login')
    }
  }, [initialized, user, router])

  // Show loading while initializing auth
  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Check if user is authenticated
  if (!user) {
    return null // Will redirect via useEffect
  }

  const handleRetry = async () => {
    setRetrying(true)
    await refreshWebUser()
    setRetrying(false)
  }

  // Check authorization - show retry option if webUser is null (might be a network issue)
  if (!webUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-amber-600 mb-2">Không thể tải thông tin người dùng.</p>
          <p className="text-gray-500 text-sm mb-4">Có thể do lỗi kết nối mạng. Vui lòng thử lại.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {retrying ? 'Đang thử...' : 'Thử lại'}
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Đăng nhập lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Check role authorization
  if (webUser.role !== 'commune_officer' && webUser.role !== 'commune_supervisor') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Bạn không có quyền truy cập trang này.</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={webUser.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
