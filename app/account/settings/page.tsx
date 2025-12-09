'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import {
  Lock,
  Eye,
  EyeOff,
  Bell,
  Globe,
  Moon,
  Shield,
  Smartphone,
  CheckCircle,
  AlertCircle,
  KeyRound,
  Mail
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'security' | 'notifications' | 'preferences'>('security')

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailSurveyApproved: true,
    emailSurveyRejected: true,
    emailNewAssignment: true,
    pushNotifications: false,
  })

  // Preferences
  const [preferences, setPreferences] = useState({
    language: 'vi',
    darkMode: false,
    compactView: false,
  })

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp')
      setPasswordLoading(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự')
      setPasswordLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setPasswordSuccess(true)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err.message || 'Không thể đổi mật khẩu')
    } finally {
      setPasswordLoading(false)
    }
  }

  const tabs = [
    { id: 'security', label: 'Bảo mật', icon: Shield },
    { id: 'notifications', label: 'Thông báo', icon: Bell },
    { id: 'preferences', label: 'Tùy chọn', icon: Globe },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt tài khoản</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý bảo mật, thông báo và tùy chọn cá nhân
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              {/* Change Password */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <KeyRound className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Đổi mật khẩu</h3>
                    <p className="text-sm text-gray-500">Cập nhật mật khẩu đăng nhập của bạn</p>
                  </div>
                </div>

                {/* Success Message */}
                {passwordSuccess && (
                  <div className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-medium text-green-800">Đổi mật khẩu thành công!</p>
                  </div>
                )}

                {/* Error Message */}
                {passwordError && (
                  <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium text-red-800">{passwordError}</p>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="block w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập lại mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium py-3 px-6 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {passwordLoading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Đang cập nhật...
                      </>
                    ) : (
                      'Đổi mật khẩu'
                    )}
                  </button>
                </form>
              </div>

              {/* Two-Factor Authentication */}
              <div className="pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                      <Smartphone className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Xác thực hai yếu tố</h3>
                      <p className="text-sm text-gray-500">Thêm lớp bảo mật cho tài khoản của bạn</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    Sắp ra mắt
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Thông báo qua Email</h3>
                  <p className="text-sm text-gray-500">Quản lý các thông báo bạn nhận qua email</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'emailSurveyApproved', label: 'Khảo sát được phê duyệt', desc: 'Nhận thông báo khi khảo sát của bạn được phê duyệt' },
                  { key: 'emailSurveyRejected', label: 'Khảo sát bị từ chối', desc: 'Nhận thông báo khi khảo sát của bạn bị từ chối' },
                  { key: 'emailNewAssignment', label: 'Phân công mới', desc: 'Nhận thông báo khi có khảo sát mới được phân công' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications] ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                          notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <Bell className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Thông báo đẩy</h3>
                    <p className="text-sm text-gray-500">Nhận thông báo trực tiếp trên trình duyệt</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Bật thông báo đẩy</p>
                    <p className="text-sm text-gray-500">Nhận thông báo ngay lập tức</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, pushNotifications: !notifications.pushNotifications })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                        notifications.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                  <Globe className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ngôn ngữ và Hiển thị</h3>
                  <p className="text-sm text-gray-500">Tùy chỉnh giao diện theo sở thích của bạn</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Language */}
                <div className="p-4 rounded-xl border border-gray-200">
                  <label className="block font-medium text-gray-900 mb-2">Ngôn ngữ</label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Dark Mode */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Moon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Chế độ tối</p>
                      <p className="text-sm text-gray-500">Giảm độ sáng màn hình</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Sắp ra mắt</span>
                    <button
                      disabled
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 opacity-50 cursor-not-allowed"
                    >
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1 shadow" />
                    </button>
                  </div>
                </div>

                {/* Compact View */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Chế độ thu gọn</p>
                    <p className="text-sm text-gray-500">Hiển thị nhiều nội dung hơn trên màn hình</p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, compactView: !preferences.compactView })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.compactView ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                        preferences.compactView ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
