'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { SurveyMapWrapper } from '@/components/map/survey-map-wrapper'
import { Database } from '@/lib/types/database'
import { Map, Globe, Filter } from 'lucide-react'
import { LocationIdentifierData } from '@/components/map/traffic-light-marker'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function CentralMapPage() {
  const { webUser, loading: authLoading } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [locationIdentifiers, setLocationIdentifiers] = useState<Record<string, LocationIdentifierData>>({})
  const [dataLoading, setDataLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      if (authLoading) return

      if (!webUser) {
        setDataLoading(false)
        return
      }

      try {
        // Fetch surveys and location identifiers in parallel
        const [surveysResult, locationIdsResult] = await Promise.all([
          // Central admin can see all surveys
          supabase
            .from('survey_locations')
            .select('*')
            .order('created_at', { ascending: false }),
          // Fetch all location identifiers
          supabase
            .from('location_identifiers')
            .select('survey_location_id, location_id, is_active, deactivation_reason')
        ])

        if (surveysResult.error) throw surveysResult.error
        if (locationIdsResult.error) throw locationIdsResult.error

        setSurveys((surveysResult.data || []) as any)

        // Convert location identifiers to a map keyed by survey_location_id
        const locIdMap: Record<string, LocationIdentifierData> = {}
        for (const locId of locationIdsResult.data || []) {
          locIdMap[locId.survey_location_id] = {
            location_id: locId.location_id,
            is_active: locId.is_active,
            deactivation_reason: locId.deactivation_reason
          }
        }
        setLocationIdentifiers(locIdMap)
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
          <p className="text-gray-600">Đang tải bản đồ toàn quốc...</p>
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

  // Count surveys that have location identifiers from the location_identifiers table
  const withIdCount = Object.keys(locationIdentifiers).length

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-3 text-white flex-shrink-0 border-b border-slate-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-semibold">Bản đồ Toàn quốc</h1>
              <p className="text-slate-400 text-sm">
                {filteredSurveys.length} / {surveys.length} vị trí • Tìm kiếm mã định danh
              </p>
            </div>
          </div>

          {/* Filters & Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
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
      </div>

      {/* Full Height Map with 2D/3D Toggle */}
      <div className="flex-1 relative min-h-0">
        <SurveyMapWrapper
          surveys={filteredSurveys}
          showClustering={filteredSurveys.length > 100}
          showHeatmap={false}
          enableDrawing={false}
          height="100%"
          showSearch={true}
          baseDetailUrl="/central/surveys"
          locationIdentifiers={locationIdentifiers}
          showModeToggle={true}
          defaultMode="2d"
        />
      </div>
    </div>
  )
}
