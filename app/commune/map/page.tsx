'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { EnhancedSurveyMap } from '@/components/map/enhanced-survey-map'
import { Database } from '@/lib/types/database'
import { Map, Layers, TrendingUp } from 'lucide-react'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function CommuneMapPage() {
  const { webUser, loading: authLoading } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchSurveys() {
      // Wait for auth to finish loading
      if (authLoading) return

      if (!webUser || !webUser.ward_id) {
        setDataLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('survey_locations')
          .select('*')
          .eq('ward_id', webUser.ward_id)

        if (error) throw error
        setSurveys(data || [])
      } catch (error) {
        console.error('Error fetching surveys:', error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchSurveys()
  }, [webUser, authLoading])

  const loading = authLoading || dataLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Đang tải bản đồ...</p>
        </div>
      </div>
    )
  }

  const statusCounts = surveys.reduce((acc, survey) => {
    acc[survey.status] = (acc[survey.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 -m-6 p-6 rounded-lg text-white">
        <div className="flex items-center gap-3 mb-2">
          <Map className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Bản đồ Khảo sát</h1>
        </div>
        <p className="text-purple-100">
          Hiển thị {surveys.length} vị trí khảo sát trên bản đồ
        </p>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-purple-100 text-xs">Chờ xử lý</div>
            <div className="text-2xl font-bold">{statusCounts['pending'] || 0}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-purple-100 text-xs">Đã xem xét</div>
            <div className="text-2xl font-bold">{statusCounts['reviewed'] || 0}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-purple-100 text-xs">Đã duyệt</div>
            <div className="text-2xl font-bold">
              {(statusCounts['approved_commune'] || 0) +
                (statusCounts['approved_central'] || 0) +
                (statusCounts['published'] || 0)}
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-purple-100 text-xs">Từ chối</div>
            <div className="text-2xl font-bold">{statusCounts['rejected'] || 0}</div>
          </div>
        </div>
      </div>

      {/* Map */}
      <Card className="shadow-xl border-0 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Bản đồ tương tác</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span>Hỗ trợ nhiều chế độ xem</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <EnhancedSurveyMap
            surveys={surveys}
            showClustering={false}
            showHeatmap={false}
            enableDrawing={false}
          />
        </div>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="p-5">
            <h3 className="font-semibold text-blue-900 mb-2">Điểm đánh dấu</h3>
            <p className="text-sm text-blue-700">
              Xem từng vị trí khảo sát riêng lẻ với thông tin chi tiết
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="p-5">
            <h3 className="font-semibold text-purple-900 mb-2">Nhóm cụm</h3>
            <p className="text-sm text-purple-700">
              Tự động nhóm các điểm gần nhau để dễ dàng quan sát
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="p-5">
            <h3 className="font-semibold text-orange-900 mb-2">Bản đồ nhiệt</h3>
            <p className="text-sm text-orange-700">
              Hiển thị mật độ khảo sát theo vùng địa lý
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
