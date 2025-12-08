'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { PhotoUpload } from '@/components/survey/photo-upload'
import {
  ArrowLeft, Save, Send, Camera, MapPin, Search, LogIn, User, Clock,
  Navigation, Ruler, Building, FileText, History, Smartphone, Calendar,
  Target, Layers, Home, Phone, CreditCard, MapPinned
} from 'lucide-react'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import { EntryPointsSection } from '@/components/survey/entry-points-section'
import { EntryPoint } from '@/lib/types/entry-points'
import { getEntryPoints } from '@/lib/services/entry-points-service'

const EnhancedSurveyMap = nextDynamic(
  () => import('@/components/map/enhanced-survey-map').then(mod => mod.EnhancedSurveyMap),
  {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Đang tải bản đồ...</div>
  }
)

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface ApprovalHistoryItem {
  id: string
  action: string
  actor_role: string
  previous_status: string
  new_status: string
  notes: string | null
  created_at: string
  profiles?: {
    full_name: string | null
  }
}

interface SurveyorProfile {
  full_name: string | null
  phone: string | null
  unit: string | null
}

export default function SurveyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { webUser, user, loading: authLoading } = useAuth()
  const [survey, setSurvey] = useState<SurveyLocation | null>(null)
  const [surveyorProfile, setSurveyorProfile] = useState<SurveyorProfile | null>(null)
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([])
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parcelCode, setParcelCode] = useState('')
  const [parcelSearchLoading, setParcelSearchLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'media' | 'history'>('info')
  const supabase = createClient()

  useEffect(() => {
    if (authLoading) return

    let mounted = true
    setDataLoading(true)

    async function fetchSurvey() {
      if (!params?.id) {
        setDataLoading(false)
        return
      }

      try {
        // Fetch survey with province/ward names and surveyor profile
        const { data, error } = await supabase
          .from('survey_locations')
          .select(`
            *,
            province:provinces!survey_locations_province_id_fkey(name),
            ward:wards!survey_locations_ward_id_fkey(name),
            surveyor:profiles!survey_locations_surveyor_id_fkey(full_name, phone, unit)
          `)
          .eq('id', params.id as string)
          .single()

        if (error) {
          console.error('Error fetching survey:', error)
          throw error
        }

        if (mounted && data) {
          setSurvey(data)

          // Set surveyor profile from joined data
          if (data.surveyor) {
            setSurveyorProfile(data.surveyor as SurveyorProfile)
          }

          // Fetch approval history
          const { data: historyData } = await supabase
            .from('approval_history')
            .select(`
              *,
              profiles:actor_id(full_name)
            `)
            .eq('survey_location_id', data.id)
            .order('created_at', { ascending: false })

          if (mounted && historyData) {
            setApprovalHistory(historyData)
          }

          // Fetch entry points
          const entryPointsData = await getEntryPoints(data.id)
          if (mounted) {
            setEntryPoints(entryPointsData)
          }
        }
      } catch (error) {
        console.error('fetchSurvey error:', error)
        if (mounted) {
          toast.error("Lỗi", {
            description: "Không thể tải thông tin khảo sát.",
          })
        }
      } finally {
        if (mounted) {
          setDataLoading(false)
        }
      }
    }

    fetchSurvey()

    return () => {
      mounted = false
    }
  }, [params?.id, authLoading])

  const handleParcelSearch = async () => {
    if (!parcelCode || !survey) return
    setParcelSearchLoading(true)

    try {
      const { data, error } = await supabase
        .from('land_parcels')
        .select('*')
        .eq('parcel_code', parcelCode)
        .single()

      if (error) throw error

      if (data) {
        setSurvey({
          ...survey,
          parcel_code: data.parcel_code,
          land_area_m2: data.parcel_area_m2,
          owner_name: data.owner_name || survey.owner_name,
        })
        toast.success("Thành công", {
          description: "Đã tìm thấy thửa đất!",
        })
      } else {
        toast.error("Không tìm thấy", {
          description: "Không tìm thấy thửa đất với mã này.",
        })
      }
    } catch (error) {
      toast.error("Lỗi", {
        description: "Lỗi khi tìm kiếm thửa đất!",
      })
    } finally {
      setParcelSearchLoading(false)
    }
  }

  const handleSave = async () => {
    if (!survey || !user) {
      toast.error("Lỗi", { description: "Không có dữ liệu khảo sát hoặc chưa đăng nhập" })
      return
    }
    setSaving(true)

    try {
      const updateData = {
        location_name: survey.location_name,
        owner_name: survey.owner_name,
        owner_phone: survey.owner_phone,
        owner_id_number: survey.owner_id_number,
        notes: survey.notes,
        land_area_m2: survey.land_area_m2,
        object_type: survey.object_type,
        land_use_type: survey.land_use_type,
        updated_at: new Date().toISOString(),
      }

      console.log('Updating survey:', survey.id, updateData)

      const { data, error, count } = await supabase
        .from('survey_locations')
        .update(updateData)
        .eq('id', survey.id)
        .select()

      console.log('Update result:', { data, error, count })

      if (error) {
        console.error('Save error:', error)
        throw error
      }

      if (!data || data.length === 0) {
        toast.error("Lỗi", {
          description: "Không thể cập nhật. Có thể bạn không có quyền chỉnh sửa hồ sơ này.",
        })
        return
      }

      // Update local state with saved data
      setSurvey(data[0])
      toast.success("Thành công", {
        description: "Đã lưu thay đổi!",
      })
    } catch (error: any) {
      console.error('handleSave error:', error)
      toast.error("Lỗi", {
        description: error?.message || "Lỗi khi lưu!",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!survey || !user) {
      toast.error("Lỗi", { description: "Không có dữ liệu hoặc chưa đăng nhập" })
      return
    }

    // Confirm before submitting
    const confirmed = window.confirm(
      `Bạn có chắc muốn gửi hồ sơ "${survey.location_name || 'Chưa đặt tên'}" để xem xét?\n\nSau khi gửi, hồ sơ sẽ được chuyển cho cấp trên xem xét và phê duyệt.`
    )
    if (!confirmed) return

    setSaving(true)

    try {
      // Update status
      const { data: updateData, error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'reviewed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)
        .select()

      console.log('Submit result:', { updateData, updateError })

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      if (!updateData || updateData.length === 0) {
        throw new Error('Không thể cập nhật trạng thái. Có thể bạn không có quyền.')
      }

      // Add to approval history
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          survey_location_id: survey.id,
          action: 'submitted',
          actor_id: user.id,
          actor_role: webUser?.role || 'commune_officer',
          previous_status: survey.status,
          new_status: 'reviewed',
          notes: 'Cán bộ xã đã xem xét và gửi lên cấp trên',
        })

      if (historyError) {
        console.error('History error:', historyError)
        // Don't throw - status already updated
      }

      toast.success("Gửi thành công!", {
        description: `Hồ sơ "${survey.location_name || 'Chưa đặt tên'}" đã được gửi để xem xét. Trạng thái: Đã xem xét`,
        duration: 5000,
      })

      // Update local state to reflect change
      setSurvey({ ...survey, status: 'reviewed' })

      // Redirect after a short delay so user sees the success message
      setTimeout(() => {
        router.push('/commune/surveys')
      }, 1500)
    } catch (error: any) {
      console.error('handleSubmitForReview error:', error)
      toast.error("Lỗi", {
        description: error?.message || "Lỗi khi gửi hồ sơ!",
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      reviewed: 'Đã xem xét',
      approved_commune: 'Đã duyệt (Xã)',
      approved_central: 'Đã duyệt (TW)',
      published: 'Đã công bố',
      rejected: 'Từ chối'
    }
    return labels[status] || status
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      reviewed: 'Xem xét',
      approved: 'Phê duyệt',
      rejected: 'Từ chối',
      published: 'Công bố'
    }
    return labels[action] || action
  }

  const loading = authLoading || dataLoading

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

  if (!survey) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">Không tìm thấy khảo sát</p>
          <Link href="/commune/surveys">
            <Button variant="outline">Quay lại danh sách</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white -m-6 mb-0 p-6 border-b shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/commune/surveys">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {survey.location_name || 'Khảo sát chưa đặt tên'}
                </h1>
                <StatusBadge status={survey.status} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="font-mono">ID: {survey.id.substring(0, 8)}...</span>
                {survey.location_identifier && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                    Mã: {survey.location_identifier}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(survey.created_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
            {survey.status === 'pending' && (
              <Button onClick={handleSubmitForReview} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4" />
                {saving ? 'Đang gửi...' : 'Gửi lên cấp trên'}
              </Button>
            )}
            {survey.status === 'reviewed' && (
              <span className="flex items-center gap-2 px-4 py-2 bg-sky-100 text-sky-700 rounded-md text-sm font-medium">
                <Send className="h-4 w-4" />
                Đã gửi xem xét
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b -mb-6 pb-0">
          {[
            { id: 'info', label: 'Thông tin', icon: FileText },
            { id: 'location', label: 'Vị trí & Bản đồ', icon: MapPin },
            { id: 'media', label: 'Hình ảnh', icon: Camera },
            { id: 'history', label: 'Lịch sử', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Ruler className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Diện tích</p>
                    <p className="text-lg font-bold text-blue-900">
                      {survey.land_area_m2 ? `${survey.land_area_m2.toLocaleString('vi-VN')} m²` : 'Chưa có'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium">Độ chính xác GPS</p>
                    <p className="text-lg font-bold text-green-900">
                      {survey.accuracy != null ? `±${survey.accuracy.toFixed(2)}m` : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <LogIn className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Lối vào</p>
                    <p className="text-lg font-bold text-purple-900">{entryPoints.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-600 rounded-lg">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-600 font-medium">Hình ảnh</p>
                    <p className="text-lg font-bold text-orange-900">{survey.photos?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Surveyor Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-blue-600" />
                Thông tin khảo sát viên
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Họ tên</p>
                    <p className="font-medium">{surveyorProfile?.full_name || 'Không rõ'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Điện thoại</p>
                    <p className="font-medium">{surveyorProfile?.phone || 'Không có'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Đơn vị</p>
                    <p className="font-medium">{surveyorProfile?.unit || 'Không có'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Owner Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-5 w-5 text-green-600" />
                Thông tin chủ sở hữu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên chủ sở hữu</label>
                  <input
                    type="text"
                    value={survey.owner_name || ''}
                    onChange={(e) => setSurvey({ ...survey, owner_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Số CMND/CCCD</label>
                  <input
                    type="text"
                    value={survey.owner_id_number || ''}
                    onChange={(e) => setSurvey({ ...survey, owner_id_number: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                  <input
                    type="text"
                    value={survey.owner_phone || ''}
                    onChange={(e) => setSurvey({ ...survey, owner_phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Land Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-amber-600" />
                Thông tin đất đai
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Nhập mã thửa đất để tìm kiếm..."
                  value={parcelCode}
                  onChange={(e) => setParcelCode(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                />
                <Button
                  onClick={handleParcelSearch}
                  disabled={parcelSearchLoading || !parcelCode}
                  variant="secondary"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {parcelSearchLoading ? 'Đang tìm...' : 'Tìm'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Mã thửa đất</label>
                  <input
                    type="text"
                    value={survey.parcel_code || ''}
                    readOnly
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Diện tích (m²)</label>
                  <input
                    type="number"
                    value={survey.land_area_m2 || ''}
                    onChange={(e) => setSurvey({ ...survey, land_area_m2: parseFloat(e.target.value) || null })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Loại đối tượng</label>
                  <input
                    type="text"
                    value={survey.object_type || ''}
                    onChange={(e) => setSurvey({ ...survey, object_type: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Mục đích sử dụng</label>
                  <input
                    type="text"
                    value={survey.land_use_type || ''}
                    onChange={(e) => setSurvey({ ...survey, land_use_type: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-gray-600" />
                Ghi chú
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={survey.notes || ''}
                onChange={(e) => setSurvey({ ...survey, notes: e.target.value })}
                rows={4}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Thêm ghi chú về khảo sát này..."
              />
            </CardContent>
          </Card>

          {/* Entry Points */}
          {entryPoints.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LogIn className="h-5 w-5 text-green-600" />
                  Lối vào ({entryPoints.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EntryPointsSection entryPoints={entryPoints} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'location' && (
        <div className="space-y-6">
          {/* Map */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-blue-600" />
                Bản đồ vị trí
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
                <EnhancedSurveyMap
                  surveys={[survey]}
                  center={survey.latitude && survey.longitude ? [survey.latitude, survey.longitude] : undefined}
                  zoom={18}
                  showHeatmap={false}
                  showClustering={false}
                  enableDrawing={false}
                  entryPoints={entryPoints}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPinned className="h-5 w-5 text-red-600" />
                  Địa chỉ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên vị trí</label>
                  <input
                    type="text"
                    value={survey.location_name || ''}
                    onChange={(e) => setSurvey({ ...survey, location_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Số nhà</label>
                    <input
                      type="text"
                      value={survey.house_number || ''}
                      readOnly
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Đường</label>
                    <input
                      type="text"
                      value={survey.street || ''}
                      readOnly
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Thôn/Ấp</label>
                  <input
                    type="text"
                    value={survey.hamlet || ''}
                    readOnly
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Địa chỉ đầy đủ</label>
                  <input
                    type="text"
                    value={survey.address || ''}
                    readOnly
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tỉnh/Thành</label>
                    <input
                      type="text"
                      value={(survey as any).province?.name || ''}
                      readOnly
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phường/Xã</label>
                    <input
                      type="text"
                      value={(survey as any).ward?.name || ''}
                      readOnly
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Navigation className="h-5 w-5 text-green-600" />
                  Tọa độ GPS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Vĩ độ (Latitude)</label>
                    <input
                      type="text"
                      value={survey.latitude || ''}
                      readOnly
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Kinh độ (Longitude)</label>
                    <input
                      type="text"
                      value={survey.longitude || ''}
                      readOnly
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Độ chính xác</label>
                  <input
                    type="text"
                    value={survey.accuracy != null ? `±${survey.accuracy.toFixed(2)}m` : 'N/A'}
                    readOnly
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                  />
                </div>
                {survey.polygon_geometry && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Có dữ liệu ranh giới polygon
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timestamps */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-purple-600" />
                Thời gian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Tạo lúc</p>
                  <p className="font-medium text-sm">{formatDate(survey.created_at)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Cập nhật</p>
                  <p className="font-medium text-sm">{formatDate(survey.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                Ảnh khảo sát ({survey.photos?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                surveyId={survey.id}
                existingPhotos={survey.photos || []}
                onPhotosChange={(photos) => setSurvey({ ...survey, photos })}
                maxPhotos={10}
                disabled={survey.status === 'published' || survey.status === 'approved_central'}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                Lịch sử phê duyệt
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvalHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Chưa có lịch sử phê duyệt</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvalHistory.map((item, index) => (
                    <div
                      key={item.id}
                      className={`relative pl-6 pb-4 ${index !== approvalHistory.length - 1 ? 'border-l-2 border-gray-200' : ''}`}
                    >
                      <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {getActionLabel(item.action)}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                              {item.actor_role}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          Bởi: {item.profiles?.full_name || 'Không rõ'}
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-500">{getStatusLabel(item.previous_status)}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium text-blue-600">{getStatusLabel(item.new_status)}</span>
                        </p>
                        {item.notes && (
                          <p className="text-sm text-gray-500 mt-2 italic">"{item.notes}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-gray-600" />
                Thông tin kỹ thuật
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Survey ID</p>
                  <p className="font-mono text-xs truncate">{survey.id}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Surveyor ID</p>
                  <p className="font-mono text-xs truncate">{survey.surveyor_id}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Ward Code</p>
                  <p className="font-mono text-xs truncate">{survey.ward_code || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Location Identifier</p>
                  <p className="font-mono text-xs truncate">{survey.location_identifier || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
