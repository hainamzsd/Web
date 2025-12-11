'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/database'
import { EntryPoint, rowToEntryPoint } from '@/lib/types/entry-points'
import { MapPin } from 'lucide-react'

// Dynamic import for BoundaryMap to avoid SSR issues
const BoundaryMap = dynamic(() => import('@/components/map/boundary-map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
})

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function CommuneMapPage() {
  const { webUser, loading: authLoading } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([])
  const [dataLoading, setDataLoading] = useState(true)
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
          .order('created_at', { ascending: false })

        // Commune officer can only see their ward
        if (webUser.ward_id) {
          query = query.eq('ward_id', webUser.ward_id)
        }

        const { data, error } = await query

        if (error) throw error
        const surveysData = (data || []) as SurveyLocation[]
        setSurveys(surveysData)

        // Fetch entry points for all surveys
        if (surveysData.length > 0) {
          const surveyIds = surveysData.map(s => s.id)
          const { data: entryData } = await supabase
            .from('survey_entry_points')
            .select('*')
            .in('survey_location_id', surveyIds)
            .order('sequence_number')

          if (entryData) {
            setEntryPoints(entryData.map(rowToEntryPoint))
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

  // Get user's province and ward IDs
  const userProvinceId = webUser?.province_id || null
  const userWardId = webUser?.ward_id || null

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-3 text-white flex-shrink-0 border-b border-slate-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-semibold">Bản đồ Xã/Phường</h1>
              <p className="text-slate-400 text-sm">
                {surveys.length} khảo sát trong địa bàn của bạn
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Height Map - Ward Only */}
      <div className="flex-1 relative min-h-0">
        <BoundaryMap
          role="commune_officer"
          userProvinceId={userProvinceId}
          userWardId={userWardId}
          surveys={surveys}
          entryPoints={entryPoints}
          height="100%"
          baseDetailUrl="/commune/surveys"
        />
      </div>
    </div>
  )
}
