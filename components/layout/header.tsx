'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function Header() {
  const { user, webUser, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    window.location.href = '/login'
  }

  const roleLabels: Record<string, string> = {
    commune_officer: 'Cán bộ Xã',
    commune_supervisor: 'Công an tỉnh/thành phố',
    central_admin: 'Quản trị Trung ương',
    system_admin: 'Quản trị Hệ thống',
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="relative z-50 border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Hệ thống Định danh Vị trí Quốc gia
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {webUser && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-gray-900">
                  {webUser.profile?.full_name || user?.email}
                </div>
                <div className="text-xs text-gray-500 flex flex-col items-end">
                  <span>{roleLabels[webUser.role]}</span>
                  {(webUser.profile?.unit || webUser.profile?.police_id) && (
                    <span className="text-gray-400">
                      {webUser.profile?.unit}
                      {webUser.profile?.unit && webUser.profile?.police_id ? ' - ' : ''}
                      {webUser.profile?.police_id}
                    </span>
                  )}
                </div>
              </div>

              <Avatar className="h-9 w-9 border border-gray-200">
                <AvatarImage src={webUser.profile?.avatar_url || ''} alt={webUser.profile?.full_name || 'User'} />
                <AvatarFallback className="bg-blue-50 text-blue-700 font-medium">
                  {webUser.profile?.full_name ? getInitials(webUser.profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-2 relative z-50 cursor-pointer text-gray-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
