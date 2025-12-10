'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { SurveyMapWrapper } from '@/components/map/survey-map-wrapper'
import { Database } from '@/lib/types/database'
import { Map, Search, BarChart3 } from 'lucide-react'
import { LocationIdentifierData } from '@/components/map/traffic-light-marker'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function CommuneMapPage() {
  const { webUser, loading: authLoading } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [locationIdentifiers, setLocationIdentifiers] = useState<Record<string, LocationIdentifierData>>({})
  const [dataLoading, setDataLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
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

        // Fetch location identifiers for these surveys
        if (data && data.length > 0) {
          const surveyIds = data.map(s => s.id)
          const { data: locIds, error: locError } = await supabase
            .from('location_identifiers')
            .select('survey_location_id, location_id, is_active, deactivation_reason')
            .in('survey_location_id', surveyIds)

          if (!locError && locIds) {
            const locIdMap: Record<string, LocationIdentifierData> = {}
            for (const locId of locIds) {
              locIdMap[locId.survey_location_id] = {
                location_id: locId.location_id,
                is_active: locId.is_active,
                deactivation_reason: locId.deactivation_reason
              }
            }
            setLocationIdentifiers(locIdMap)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
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

  // Apply status filter
  const filteredSurveys = statusFilter === 'all'
    ? surveys
    : surveys.filter(s => {
        if (statusFilter === 'pending') return s.status === 'pending' || s.status === 'reviewed'
        if (statusFilter === 'approved') return s.status === 'approved_commune' || s.status === 'approved_central' || s.status === 'published'
        if (statusFilter === 'rejected') return s.status === 'rejected'
        // Filter surveys that have location identifiers (from location_identifiers table)
        if (statusFilter === 'has_id') return !!locationIdentifiers[s.id]
        return true
      })

  const statusCounts = surveys.reduce((acc, survey) => {
    acc[survey.status] = (acc[survey.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const approvedCount = (statusCounts['approved_commune'] || 0) +
    (statusCounts['approved_central'] || 0) +
    (statusCounts['published'] || 0)

  const pendingCount = (statusCounts['pending'] || 0) + (statusCounts['reviewed'] || 0)
  const withIdCount = Object.keys(locationIdentifiers).length

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-3 text-white flex-shrink-0 border-b border-slate-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Map className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-semibold">Bản đồ Khảo sát</h1>
              <p className="text-slate-400 text-sm">
                {filteredSurveys.length} / {surveys.length} vị trí • Tìm kiếm mã định danh
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1 border border-slate-600/50">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-800' : 'text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Tất cả ({surveys.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Chờ ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === 'approved' ? 'bg-green-500 text-white' : 'text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Duyệt ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('has_id')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === 'has_id' ? 'bg-purple-500 text-white' : 'text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Có mã ({withIdCount})
            </button>
          </div>
        </div>
      </div>

      {/* Full Height Map with 2D/3D Toggle */}
      <div className="flex-1 relative min-h-0">
        <SurveyMapWrapper
          surveys={filteredSurveys}
          showClustering={false}
          showHeatmap={false}
          enableDrawing={false}
          height="100%"
          showSearch={true}
          baseDetailUrl="/commune/surveys"
          locationIdentifiers={locationIdentifiers}
          showModeToggle={true}
          defaultMode="2d"
        />
      </div>
    </div>
  )
}
