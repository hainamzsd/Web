'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export function Header() {
  const { user, webUser, signOut } = useAuth()
  
  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  
  const roleLabels: Record<string, string> = {
    commune_officer: 'Cán bộ Xã',
    commune_supervisor: 'Công an tỉnh/thành phố',
    central_admin: 'Quản trị Trung ương',
    system_admin: 'Quản trị Hệ thống',
  }

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Hệ thống Định danh Vị trí Quốc gia
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {webUser && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {user?.email}
                </div>
                <div className="text-xs text-gray-500">
                  {roleLabels[webUser.role]}
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </div>
      </div>
    </header>
  )
}
