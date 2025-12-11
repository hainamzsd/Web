'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Shield, Search, X, Check, Ban, Trash2, Eye, EyeOff } from 'lucide-react'

interface Province {
  code: number
  name: string
}

interface Ward {
  code: number
  name: string
  province_code: number
}

interface WebUser {
  id: string
  profile_id: string
  role: string
  province_id: number | null
  ward_id: number | null
  is_active: boolean
  last_login: string | null
  created_at: string
  profiles?: {
    full_name: string
    phone: string
    police_id: string
  }
  province?: {
    code: number
    name: string
  }
  ward?: {
    code: number
    name: string
  }
}

interface CreateUserForm {
  email: string
  password: string
  full_name: string
  phone: string
  police_id: string
  role: 'commune_supervisor' | 'commune_officer' | ''
  province_id: number | null
  ward_id: number | null
}

const initialFormState: CreateUserForm = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  police_id: '',
  role: '',
  province_id: null,
  ward_id: null
}

export default function UsersPage() {
  const { webUser } = useAuth()
  const [users, setUsers] = useState<WebUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState<CreateUserForm>(initialFormState)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [loadingWards, setLoadingWards] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!webUser) return

    try {
      const response = await fetch('/api/users')
      const data = await response.json()

      if (data.error) {
        console.error('Error fetching users:', data.error)
        return
      }

      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [webUser])

  // Fetch provinces
  const fetchProvinces = useCallback(async () => {
    const { data, error } = await supabase
      .from('provinces')
      .select('code, name')
      .order('name')

    if (!error && data) {
      setProvinces(data)
    }
  }, [supabase])

  // Fetch wards by province
  const fetchWards = useCallback(async (provinceCode: number) => {
    setLoadingWards(true)
    const { data, error } = await supabase
      .from('wards')
      .select('code, name, province_code')
      .eq('province_code', provinceCode)
      .order('name')

    if (!error && data) {
      setWards(data)
    }
    setLoadingWards(false)
  }, [supabase])

  useEffect(() => {
    fetchUsers()
    fetchProvinces()
  }, [fetchUsers, fetchProvinces])

  // When province changes, fetch wards
  useEffect(() => {
    if (formData.province_id) {
      fetchWards(formData.province_id)
    } else {
      setWards([])
    }
  }, [formData.province_id, fetchWards])

  const roleLabels: Record<string, string> = {
    commune_officer: 'Cán bộ Xã/Phường',
    commune_supervisor: 'Công an Tỉnh/TP',
    central_admin: 'Quản trị Trung ương',
    system_admin: 'Quản trị Hệ thống',
  }

  const roleColors: Record<string, string> = {
    commune_officer: 'bg-blue-100 text-blue-800',
    commune_supervisor: 'bg-purple-100 text-purple-800',
    central_admin: 'bg-green-100 text-green-800',
    system_admin: 'bg-red-100 text-red-800',
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profiles?.police_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profiles?.phone?.includes(searchTerm)

    const matchesRole = !roleFilter || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  // Handle form submission
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      // Reset form and close modal
      setFormData(initialFormState)
      setShowCreateModal(false)

      // Refresh users list
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle user active status
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_active: !currentStatus })
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  // Delete user
  const deleteUser = async (userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Người dùng</h1>
          <p className="text-gray-500 mt-1">
            Quản lý tài khoản và quyền truy cập
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Thêm người dùng
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'commune_officer').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Cán bộ Xã/Phường</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'commune_supervisor').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Công an Tỉnh/TP</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'central_admin').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Quản trị TW</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.is_active).length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Đang hoạt động</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Danh sách người dùng ({filteredUsers.length})</CardTitle>
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-64"
                />
              </div>
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Tất cả vai trò</option>
                <option value="commune_officer">Cán bộ Xã/Phường</option>
                <option value="commune_supervisor">Công an Tỉnh/TP</option>
                <option value="central_admin">Quản trị TW</option>
                <option value="system_admin">Quản trị HT</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Họ tên</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Mã CA</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Vai trò</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Địa bàn</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Điện thoại</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Đăng nhập cuối</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Trạng thái</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      {searchTerm || roleFilter ? 'Không tìm thấy kết quả' : 'Chưa có người dùng nào'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {user.profiles?.full_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono">
                        {user.profiles?.police_id || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {user.role === 'commune_officer' && user.ward ? (
                          <span>{user.ward.name}, {user.province?.name}</span>
                        ) : user.role === 'commune_supervisor' && user.province ? (
                          <span>{user.province.name}</span>
                        ) : (
                          <span className="text-gray-400">Toàn quốc</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {user.profiles?.phone || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString('vi-VN')
                          : 'Chưa đăng nhập'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {user.is_active ? 'Hoạt động' : 'Ngưng'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className={`p-1.5 rounded-md transition-colors ${user.is_active
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-green-600 hover:bg-green-50'
                              }`}
                            title={user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          >
                            {user.is_active ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Tạo tài khoản mới</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData(initialFormState)
                  setError(null)
                }}
                className="p-1 hover:bg-gray-100 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vai trò <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({
                    ...formData,
                    role: e.target.value as CreateUserForm['role'],
                    province_id: null,
                    ward_id: null
                  })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Chọn vai trò</option>
                  <option value="commune_supervisor">Công an Tỉnh/TP (Supervisor)</option>
                  <option value="commune_officer">Cán bộ Xã/Phường (Commune)</option>
                </select>
              </div>

              {/* Province Selection - Show for supervisor and commune */}
              {formData.role && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tỉnh/Thành phố <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.province_id || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      province_id: e.target.value ? Number(e.target.value) : null,
                      ward_id: null // Reset ward when province changes
                    })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ward Selection - Only show for commune_officer */}
              {formData.role === 'commune_officer' && formData.province_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Xã/Phường <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.ward_id || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      ward_id: e.target.value ? Number(e.target.value) : null
                    })}
                    required
                    disabled={loadingWards}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                  >
                    <option value="">
                      {loadingWards ? 'Đang tải...' : 'Chọn xã/phường'}
                    </option>
                    {wards.map((ward) => (
                      <option key={ward.code} value={ward.code}>
                        {ward.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <hr className="my-4" />

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="user@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0912345678"
                />
              </div>

              {/* Police ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số hiệu
                </label>
                <input
                  type="text"
                  value={formData.police_id}
                  onChange={(e) => setFormData({ ...formData, police_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="CA12345"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData(initialFormState)
                    setError(null)
                  }}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
