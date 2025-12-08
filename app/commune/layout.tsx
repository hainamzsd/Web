'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CommuneLayout({ children }: { children: React.ReactNode }) {
  const { webUser, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  if (!user || !webUser) {
    return null
  }

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
