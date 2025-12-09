'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { EnhancedSurveyMap } from '@/components/map/enhanced-survey-map'
import { Database } from '@/lib/types/database'
import { Map, Search, BarChart3 } from 'lucide-react'

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

      if (!webUser) {
        setDataLoading(false)
        return
      }

      try {
        let query = supabase
          .from('survey_locations')
          .select('*')

        // Filter by ward_id or province_id based on what's available
        if (webUser.ward_id) {
          query = query.eq('ward_id', webUser.ward_id)
        } else if (webUser.province_id) {
          query = query.eq('province_id', webUser.province_id)
        }

        const { data, error } = await query

        if (error) throw error
        setSurveys((data || []) as any)
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
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
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

  const approvedCount = (statusCounts['approved_commune'] || 0) +
    (statusCounts['approved_central'] || 0) +
    (statusCounts['published'] || 0)

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-3 text-white flex-shrink-0 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-semibold">Bản đồ Khảo sát</h1>
              <p className="text-slate-400 text-sm">
                {surveys.length} vị trí • Tìm kiếm theo mã định danh, tên, địa chỉ
              </p>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5 border border-slate-600/50">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="text-sm text-slate-300">Chờ: {statusCounts['pending'] || 0}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5 border border-slate-600/50">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-sm text-slate-300">Duyệt: {approvedCount}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5 border border-slate-600/50">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-sm text-slate-300">Từ chối: {statusCounts['rejected'] || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Height Map */}
      <div className="flex-1 relative min-h-0">
        <EnhancedSurveyMap
          surveys={surveys}
          showClustering={false}
          showHeatmap={false}
          enableDrawing={false}
          height="100%"
          showSearch={true}
          baseDetailUrl="/commune/surveys"
        />
      </div>
    </div>
  )
}
