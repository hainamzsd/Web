'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Eye, Search } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface SurveysClientProps {
  initialSurveys: SurveyLocation[]
}

export function SurveysClient({ initialSurveys }: SurveysClientProps) {
  const [surveys] = useState<SurveyLocation[]>(initialSurveys)
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyLocation[]>(initialSurveys)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    let filtered = surveys

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s =>
        (s.location_name?.toLowerCase().includes(term)) ||
        (s.address?.toLowerCase().includes(term)) ||
        (s.owner_name?.toLowerCase().includes(term))
      )
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    setFilteredSurveys(filtered)
  }, [surveys, searchTerm, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Khảo sát</h1>
          <p className="text-gray-500 mt-1">
            Quản lý các khảo sát vị trí từ ứng dụng di động ({filteredSurveys.length} / {surveys.length})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tìm kiếm và lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên vị trí, địa chỉ, chủ sở hữu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="reviewed">Đã xem xét</option>
              <option value="approved_commune">Xã đã duyệt</option>
              <option value="approved_central">Trung ương đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách khảo sát</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSurveys.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Chưa có khảo sát nào
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Tên vị trí
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Địa chỉ
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Loại đối tượng
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Trạng thái
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Ngày tạo
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurveys.map((survey) => (
                    <tr key={survey.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {survey.location_name || 'Chưa đặt tên'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {survey.address || 'Chưa có địa chỉ'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {survey.object_type || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={survey.status} />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(survey.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/commune/surveys/${survey.id}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Xem
                          </Button>
                        </Link>
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
