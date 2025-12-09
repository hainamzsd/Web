'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import {
  LogOut,
  Bell,
  ChevronDown,
  User,
  Settings,
  Shield,
  Calendar
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function Header() {
  const router = useRouter()
  const { user, webUser, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    window.location.href = '/login'
  }

  const handleNavigate = (path: string) => {
    setShowUserMenu(false)
    router.push(path)
  }

  const roleLabels: Record<string, string> = {
    commune_officer: 'Cán bộ Xã',
    commune_supervisor: 'Công an tỉnh/thành phố',
    central_admin: 'Quản trị Trung ương',
    system_admin: 'Quản trị Hệ thống',
  }

  const roleColors: Record<string, string> = {
    commune_officer: 'bg-violet-500/20 text-violet-200 border-violet-400/30',
    commune_supervisor: 'bg-teal-500/20 text-teal-200 border-teal-400/30',
    central_admin: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    system_admin: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <header className="relative z-[2000] bg-gradient-to-r from-slate-800 to-slate-900">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left side - Title & Date */}
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-base font-semibold text-white">
              Hệ thống Định danh Vị trí Quốc gia
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="h-3 w-3" />
              <span>{today}</span>
            </div>
          </div>
        </div>

        {/* Right side - Actions & User */}
        <div className="flex items-center gap-4">

          {/* Divider */}
          <div className="h-8 w-px bg-slate-600" />

          {/* User Profile */}
          {webUser && (
            <div className="relative ">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 rounded-xl border border-slate-600/50 bg-slate-700/50 px-4  transition-all hover:bg-slate-700 hover:border-slate-500"
              >
                <Avatar className="h-8 w-8 border-2 border-slate-500 shadow-sm">
                  <AvatarImage
                    src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Vietnam_People%27s_Public_Security_Emblem.png"
                    alt={webUser.profile?.full_name || 'User'}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-medium">
                    {webUser.profile?.full_name ? getInitials(webUser.profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="hidden text-left md:block">
                  <div className="text-sm font-medium text-white">
                    {webUser.profile?.full_name || user?.email?.split('@')[0]}
                  </div>
                  <div className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${roleColors[webUser.role]}`}>
                    <Shield className="h-2.5 w-2.5" />
                    {roleLabels[webUser.role]}
                  </div>
                </div>

                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[2001]"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-[2002] mt-3 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                    {/* User Info Header */}
                    <div className="border-b border-gray-100 bg-gradient-to-br from-slate-50 to-gray-100 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-lg ring-2 ring-gray-100">
                          <AvatarImage
                            src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Vietnam_People%27s_Public_Security_Emblem.png"
                            alt={webUser.profile?.full_name || 'User'}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium">
                            {webUser.profile?.full_name ? getInitials(webUser.profile.full_name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {webUser.profile?.full_name || 'Người dùng'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                          </p>
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                            <Shield className="h-2.5 w-2.5" />
                            {roleLabels[webUser.role]}
                          </div>
                        </div>
                      </div>
                      {(webUser.profile?.unit || webUser.profile?.police_id) && (
                        <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-gray-600 shadow-sm border border-gray-100">
                          <span className="font-medium text-gray-700">Đơn vị:</span> {webUser.profile?.unit}
                          {webUser.profile?.unit && webUser.profile?.police_id && ' • '}
                          {webUser.profile?.police_id && (
                            <>
                              <span className="font-medium text-gray-700">Mã:</span> {webUser.profile?.police_id}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={() => handleNavigate('/account/profile')}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Thông tin cá nhân</p>
                          <p className="text-xs text-gray-500">Xem và chỉnh sửa hồ sơ</p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleNavigate('/account/settings')}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                          <Settings className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Cài đặt tài khoản</p>
                          <p className="text-xs text-gray-500">Bảo mật và tùy chọn</p>
                        </div>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 p-2">
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                          <LogOut className="h-4 w-4" />
                        </div>
                        Đăng xuất khỏi hệ thống
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Bottom border with gap effect */}
      <div className="h-px bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700" />
    </header>
  )
}
