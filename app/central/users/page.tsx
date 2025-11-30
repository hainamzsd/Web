'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Shield } from 'lucide-react'

interface WebUser {
  id: string
  role: string
  commune_code: string | null
  district_code: string | null
  province_code: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  profiles?: {
    full_name: string
    phone: string
    police_id: string
  }
}

export default function UsersPage() {
  const { webUser } = useAuth()
  const [users, setUsers] = useState<WebUser[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchUsers() {
      if (!webUser) return

      try {
        const { data, error } = await supabase
          .from('web_users')
          .select(`
            *,
            profiles:profiles(full_name, phone, police_id)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        setUsers((data || []) as WebUser[])
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [webUser, supabase])

  const roleLabels: Record<string, string> = {
    commune_officer: 'Cán bộ Xã',
    commune_supervisor: 'Công an tỉnh/thành phố',
    central_admin: 'Quản trị Trung ương',
    system_admin: 'Quản trị Hệ thống',
  }

  const roleColors: Record<string, string> = {
    commune_officer: 'bg-blue-100 text-blue-800',
    commune_supervisor: 'bg-purple-100 text-purple-800',
    central_admin: 'bg-green-100 text-green-800',
    system_admin: 'bg-red-100 text-red-800',
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
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Thêm người dùng
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'commune_officer').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Cán bộ Xã</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'commune_supervisor').length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Công an tỉnh/thành phố</p>
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
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_active).length}
            </div>
            <p className="text-sm text-gray-600 mt-1">Đang hoạt động</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Họ tên
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Mã CA
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Vai trò
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Địa bàn
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Điện thoại
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Đăng nhập lần cuối
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">
                      {user.profiles?.full_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono">
                      {user.profiles?.police_id || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'
                        }`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {user.commune_code
                        ? `${user.province_code}/${user.district_code}/${user.commune_code}`
                        : 'Toàn quốc'}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
