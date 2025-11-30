'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function HistoryPage() {
  const { webUser } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchHistory() {
      if (!webUser) return

      try {
        // Supervisors are province-level users - filter by province_code
        const { data, error } = await supabase
          .from('survey_locations')
          .select('*')
          .eq('province_code', webUser.province_code)
          .in('status', ['approved_commune', 'rejected', 'approved_central', 'published'])
          .order('updated_at', { ascending: false })
          .limit(100)

        if (error) throw error
        setSurveys(data || [])
      } catch (error) {
        console.error('Error fetching history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [webUser])

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Lịch sử Xem xét</h1>
        <p className="text-gray-500 mt-1">
          Tất cả khảo sát đã được xử lý
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đã xử lý ({surveys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {surveys.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Chưa có lịch sử xem xét
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
                      Chủ sở hữu
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Trạng thái
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Mã định danh
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Ngày cập nhật
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((survey) => (
                    <tr key={survey.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {survey.location_name || 'Chưa đặt tên'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {survey.address || 'Chưa có địa chỉ'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {survey.owner_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={survey.status} />
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-primary">
                        {survey.location_identifier || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(survey.updated_at).toLocaleDateString('vi-VN')}
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
