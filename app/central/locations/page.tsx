'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Search } from 'lucide-react'

interface LocationIdentifier {
  id: string
  location_id: string
  admin_code: string
  sequence_number: string
  assigned_at: string
  is_active: boolean
  survey_location?: {
    location_name: string
    address: string
    owner_name: string
  }
}

export default function LocationsPage() {
  const { webUser } = useAuth()
  const [locations, setLocations] = useState<LocationIdentifier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchLocations() {
      if (!webUser) return

      try {
        const { data, error } = await supabase
          .from('location_identifiers')
          .select(`
            *,
            survey_location:survey_locations(location_name, address, owner_name)
          `)
          .order('assigned_at', { ascending: false })
          .limit(100)

        if (error) throw error
        setLocations((data || []) as LocationIdentifier[])
      } catch (error) {
        console.error('Error fetching locations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [webUser, supabase])

  const filteredLocations = locations.filter(loc =>
    loc.location_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.survey_location?.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.survey_location?.address?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleExport = () => {
    // Simple CSV export
    const csv = [
      ['Mã định danh', 'Tên vị trí', 'Địa chỉ', 'Chủ sở hữu', 'Ngày cấp', 'Trạng thái'].join(','),
      ...filteredLocations.map(loc => [
        loc.location_id,
        loc.survey_location?.location_name || '',
        loc.survey_location?.address || '',
        loc.survey_location?.owner_name || '',
        new Date(loc.assigned_at).toLocaleDateString('vi-VN'),
        loc.is_active ? 'Hoạt động' : 'Ngưng hoạt động'
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `location_identifiers_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
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
          <h1 className="text-3xl font-bold text-gray-900">Mã định danh Vị trí</h1>
          <p className="text-gray-500 mt-1">
            Quản lý tất cả mã định danh đã cấp phát
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Xuất CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách mã định danh ({filteredLocations.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLocations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có mã định danh nào'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Mã định danh
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Tên vị trí
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Địa chỉ
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Chủ sở hữu
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Ngày cấp
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((location) => (
                    <tr key={location.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm font-semibold text-primary">
                        {location.location_id}
                      </td>
                      <td className="py-3 px-4">
                        {location.survey_location?.location_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {location.survey_location?.address || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {location.survey_location?.owner_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(location.assigned_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${location.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {location.is_active ? 'Hoạt động' : 'Ngưng'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
