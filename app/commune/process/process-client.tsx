'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database } from '@/lib/types/database'
import dynamic from 'next/dynamic'
import { RecordProcessor } from '@/components/records/record-processor'
import { executeWorkflowAction, canPerformAction } from '@/lib/services/workflow-service'
import { BoundaryContext } from '@/lib/security/boundary-enforcement'
import { toast } from 'sonner'
import {
  FileCheck,
  Map as MapIcon,
  Filter,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import type { Icon } from 'leaflet'

// Dynamic imports for map components
const RegionalBoundaryMap = dynamic(
  () => import('@/components/map/regional-boundary-map').then(mod => mod.RegionalBoundaryMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Đang tải bản đồ...</div> }
)

const PolygonEditor = dynamic(
  () => import('@/components/map/polygon-editor').then(mod => mod.PolygonEditor),
  { ssr: false }
)

// Dynamic imports for react-leaflet components
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface ProcessClientProps {
  initialSurveys: SurveyLocation[]
  initialStats: {
    pending: number
    reviewed: number
    approved: number
    rejected: number
  }
}

export function ProcessClient({ initialSurveys, initialStats }: ProcessClientProps) {
  const { webUser, user } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>(initialSurveys)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyLocation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [stats, setStats] = useState(initialStats)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  const boundaryContext: BoundaryContext = {
    role: webUser?.role || 'commune_officer',
    province_code: webUser?.province_code || null,
    district_code: webUser?.district_code || null,
    commune_code: webUser?.commune_code || null
  }

  const fetchSurveys = async () => {
    if (!webUser || !webUser.ward_id) return
    setRefreshing(true)

    try {
      let query = supabase
        .from('survey_locations')
        .select('*')
        .eq('ward_id', webUser.ward_id)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setSurveys(data || [])
    } catch (error) {
      console.error('Error fetching surveys:', error)
      toast.error('Lỗi', {
        description: 'Không thể tải danh sách khảo sát'
      })
    } finally {
      setRefreshing(false)
    }
  }

  const fetchStats = async () => {
    if (!webUser || !webUser.ward_id) return

    try {
      const statuses = ['pending', 'reviewed', 'approved_commune', 'rejected']
      const counts = await Promise.all(
        statuses.map(async (status) => {
          const { count } = await supabase
            .from('survey_locations')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', webUser.ward_id)
            .eq('status', status)
          return count || 0
        })
      )

      setStats({
        pending: counts[0],
        reviewed: counts[1],
        approved: counts[2],
        rejected: counts[3]
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleApprove = async (record: SurveyLocation, notes?: string) => {
    if (!user || !webUser) return

    const validation = canPerformAction(
      record,
      'approve',
      webUser.role,
      webUser.commune_code
    )

    if (!validation.allowed) {
      toast.error('Không có quyền', {
        description: validation.reason
      })
      return
    }

    const result = await executeWorkflowAction(
      record.id,
      'approve',
      user.id,
      webUser.role,
      notes
    )

    if (result.success) {
      await fetchSurveys()
      await fetchStats()
      if (selectedSurvey?.id === record.id) {
        setSelectedSurvey(null)
      }
    } else {
      toast.error('Lỗi', {
        description: result.message
      })
    }
  }

  const handleReject = async (record: SurveyLocation, reason: string) => {
    if (!user || !webUser) return

    const validation = canPerformAction(
      record,
      'reject',
      webUser.role,
      webUser.commune_code
    )

    if (!validation.allowed) {
      toast.error('Không có quyền', {
        description: validation.reason
      })
      return
    }

    const result = await executeWorkflowAction(
      record.id,
      'reject',
      user.id,
      webUser.role,
      reason
    )

    if (result.success) {
      await fetchSurveys()
      await fetchStats()
      if (selectedSurvey?.id === record.id) {
        setSelectedSurvey(null)
      }
    } else {
      toast.error('Lỗi', {
        description: result.message
      })
    }
  }

  const handleForward = async (record: SurveyLocation, notes?: string) => {
    if (!user || !webUser) return

    const validation = canPerformAction(
      record,
      'forward',
      webUser.role,
      webUser.commune_code
    )

    if (!validation.allowed) {
      toast.error('Không có quyền', {
        description: validation.reason
      })
      return
    }

    const result = await executeWorkflowAction(
      record.id,
      'forward',
      user.id,
      webUser.role,
      notes
    )

    if (result.success) {
      await fetchSurveys()
      await fetchStats()
      if (selectedSurvey?.id === record.id) {
        setSelectedSurvey(null)
      }
    } else {
      toast.error('Lỗi', {
        description: result.message
      })
    }
  }

  const handleEdit = (record: SurveyLocation) => {
    window.location.href = `/commune/surveys/${record.id}`
  }

  const [markerIcon, setMarkerIcon] = useState<Icon | null>(null)

  useEffect(() => {
    // Dynamically import leaflet only on client side
    import('leaflet').then((L) => {
      setMarkerIcon(new L.Icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }))
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Xử lý Hồ sơ Khảo sát</h1>
        <p className="text-gray-500 mt-1">
          Xem xét và xử lý các hồ sơ khảo sát được gửi từ ứng dụng di động
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ xử lý</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('reviewed')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã xem xét</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.reviewed}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('approved_commune')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã phê duyệt</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <FileCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('rejected')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã từ chối</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <FileCheck className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Regional Map */}
        <Card className="lg:sticky lg:top-6" style={{ height: 'calc(100vh - 200px)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-blue-600" />
              Bản đồ Khu vực - Ranh giới Quyền hạn
            </CardTitle>
            <p className="text-sm text-gray-500">
              Các vùng ngoài quyền hạn của bạn được tô xám và không thể tương tác
            </p>
          </CardHeader>
          <CardContent className="h-[calc(100%-120px)]">
            <RegionalBoundaryMap
              boundaryContext={boundaryContext}
              showBoundaryMask={true}
            >
              {surveys.map((survey) => (
                markerIcon && (
                  <Marker
                    key={survey.id}
                    position={[survey.latitude, survey.longitude]}
                    icon={markerIcon}
                    eventHandlers={{
                      click: () => setSelectedSurvey(survey)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <p className="font-semibold">{survey.location_name || 'Chưa đặt tên'}</p>
                        <p className="text-sm text-gray-600">{survey.address}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Trạng thái: {survey.status}
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => setSelectedSurvey(survey)}
                        >
                          Xem chi tiết
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {selectedSurvey && selectedSurvey.polygon_geometry && (
                <PolygonEditor
                  boundaryContext={boundaryContext}
                  initialPolygon={selectedSurvey.polygon_geometry as any}
                  editable={false}
                />
              )}
            </RegionalBoundaryMap>
          </CardContent>
        </Card>

        {/* Right Panel - Records List */}
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="all">Tất cả</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="reviewed">Đã xem xét</option>
                    <option value="approved_commune">Đã phê duyệt</option>
                    <option value="rejected">Đã từ chối</option>
                  </select>
                </div>
                <Button
                  onClick={fetchSurveys}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Records List */}
          {surveys.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Không có hồ sơ nào
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {surveys.map((survey) => (
                <RecordProcessor
                  key={survey.id}
                  record={survey}
                  userRole={webUser?.role || 'commune_officer'}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={handleEdit}
                  onForward={handleForward}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
