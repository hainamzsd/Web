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
  Target, Layers, Home, Phone, CreditCard, MapPinned, Users, TreePine,
  FileCheck, Link as LinkIcon, Unlink, AlertCircle, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import { Database, LandParcelWithDetails, LandCertificate } from '@/lib/types/database'
import { toast } from 'sonner'
import { EntryPointsSection } from '@/components/survey/entry-points-section'
import { EntryPoint } from '@/lib/types/entry-points'
import { getEntryPoints } from '@/lib/services/entry-points-service'
import {
  lookupCertificate,
  searchCertificates,
  saveCertificateToDatabase,
  getParcelWithDetails,
  linkSurveyToParcel,
  unlinkSurveyFromParcel,
  getAvailableCertificateNumbers,
  LAND_USE_TYPES
} from '@/lib/services/certificate-service'

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
  const [certificateNumber, setCertificateNumber] = useState('')
  const [certificateSearchLoading, setCertificateSearchLoading] = useState(false)
  const [linkedParcel, setLinkedParcel] = useState<LandParcelWithDetails | null>(null)
  const [parcelLinking, setParcelLinking] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'media' | 'history'>('info')
  const [wardBoundary, setWardBoundary] = useState<any>(null)
  const supabase = createClient()
  const availableCertificates = getAvailableCertificateNumbers()

  // Load ward boundary for commune officers
  useEffect(() => {
    async function loadWardBoundary() {
      if (!webUser?.province_id || !webUser?.ward_id) return

      try {
        // 1. Get province codename
        const { data: provinceData } = await supabase
          .from('provinces')
          .select('codename')
          .eq('code', webUser.province_id)
          .single()

        if (!provinceData?.codename) return

        // 2. Convert codename to folder name (remove underscores: ha_noi -> hanoi)
        const folderName = provinceData.codename.replace(/_/g, '')

        // 3. Load ward GeoJSON for this province
        const response = await fetch(`/geojson/${folderName}/ward.geojson`)
        if (!response.ok) {
          console.warn(`Ward GeoJSON not found for province: ${provinceData.codename}`)
          return
        }

        const wardGeoJson = await response.json()

        // 4. Find the specific ward by ma_xa (ward code)
        // Note: GeoJSON ma_xa has leading zeros (e.g., "00070") but DB ward_id is integer (e.g., 70)
        const wardFeature = wardGeoJson.features?.find(
          (f: any) => parseInt(f.properties?.ma_xa, 10) === webUser.ward_id
        )

        if (wardFeature) {
          setWardBoundary(wardFeature)
        } else {
          console.warn(`Ward ${webUser.ward_id} not found in GeoJSON`)
        }
      } catch (error) {
        console.error('Error loading ward boundary:', error)
      }
    }

    loadWardBoundary()
  }, [webUser?.province_id, webUser?.ward_id, supabase])

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

          // Fetch linked parcel if exists
          if (data.land_parcel_id) {
            const parcelData = await getParcelWithDetails(data.land_parcel_id)
            if (mounted && parcelData) {
              setLinkedParcel(parcelData)
            }
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

  const handleCertificateSearch = async () => {
    if (!certificateNumber || !survey || !user) return
    setCertificateSearchLoading(true)

    try {
      // Look up certificate from mock API
      const certData = await lookupCertificate(certificateNumber)

      if (!certData) {
        toast.error("Không tìm thấy", {
          description: "Không tìm thấy giấy chứng nhận với số này. Vui lòng kiểm tra lại.",
        })
        return
      }

      // Save certificate data to database
      const { certificate, parcels } = await saveCertificateToDatabase(certData)

      if (parcels.length === 0) {
        toast.error("Lỗi", {
          description: "Không có thửa đất nào trong giấy chứng nhận này.",
        })
        return
      }

      // For now, use the first parcel (in future, could let user select)
      const parcel = parcels[0]

      // Link survey to parcel
      await linkSurveyToParcel(survey.id, parcel.id, certificate.id, user.id)

      // Update local state
      setLinkedParcel(parcel)
      setSurvey({
        ...survey,
        land_parcel_id: parcel.id,
        certificate_id: certificate.id,
        parcel_code: parcel.parcel_code,
        land_area_m2: parcel.total_area_m2,
        parcel_verified_at: new Date().toISOString(),
        parcel_verified_by: user.id,
      })

      toast.success("Thành công", {
        description: `Đã liên kết với thửa đất ${parcel.parcel_code}!`,
      })
    } catch (error: any) {
      console.error('Certificate search error:', error)
      toast.error("Lỗi", {
        description: error?.message || "Lỗi khi tìm kiếm giấy chứng nhận!",
      })
    } finally {
      setCertificateSearchLoading(false)
    }
  }

  const handleUnlinkParcel = async () => {
    if (!survey || !user) return

    const confirmed = window.confirm(
      'Bạn có chắc muốn hủy liên kết thửa đất này? Thông tin chủ sở hữu từ giấy chứng nhận sẽ không còn hiển thị.'
    )
    if (!confirmed) return

    setParcelLinking(true)
    try {
      await unlinkSurveyFromParcel(survey.id)

      setLinkedParcel(null)
      setSurvey({
        ...survey,
        land_parcel_id: null,
        certificate_id: null,
        parcel_code: null,
        parcel_verified_at: null,
        parcel_verified_by: null,
      })

      toast.success("Đã hủy liên kết", {
        description: "Đã hủy liên kết thửa đất thành công.",
      })
    } catch (error: any) {
      toast.error("Lỗi", {
        description: error?.message || "Lỗi khi hủy liên kết!",
      })
    } finally {
      setParcelLinking(false)
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
        representative_name: survey.representative_name,
        representative_phone: survey.representative_phone,
        representative_id_number: survey.representative_id_number,
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

    // Check if parcel is linked (required before submission)
    if (!survey.land_parcel_id) {
      toast.error("Chưa liên kết thửa đất", {
        description: "Vui lòng tra cứu và liên kết giấy chứng nhận QSDĐ trước khi gửi hồ sơ.",
      })
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
      approved_province: 'Đã duyệt (Tỉnh)',
      approved_commune: 'Đã duyệt (Xã cũ)',
      approved_central: 'Đã duyệt (TW)',
      rejected: 'Từ chối'
    }
    return labels[status] || status
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      submitted: 'Gửi xem xét',
      reviewed: 'Xem xét',
      approved: 'Phê duyệt',
      rejected: 'Từ chối'
    }
    return labels[action] || action
  }

  const loading = authLoading || dataLoading
  // Commune officers can only VIEW surveys - all editing/approval is done by App or Supervisor
  const isReadOnly = true

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
          {/* Commune officers only view - no action buttons */}
          <div className="flex gap-2">
            <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-md text-sm font-medium">
              <FileText className="h-4 w-4" />
              Chỉ xem
            </span>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

          {/* Land Certificate Info - View Only for Commune Officers */}
          <Card className={!linkedParcel ? 'border-gray-200' : 'border-green-300 bg-green-50'}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-5 w-5 text-gray-600" />
                Giấy chứng nhận QSDĐ
                {linkedParcel ? (
                  <span className="ml-2 flex items-center gap-1 text-sm font-normal text-green-700 bg-green-100 px-2 py-0.5 rounded">
                    <CheckCircle2 className="h-4 w-4" />
                    Đã liên kết
                  </span>
                ) : (
                  <span className="ml-2 flex items-center gap-1 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    Chưa có thông tin
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!linkedParcel ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                  <FileCheck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Chưa có thông tin giấy chứng nhận QSDĐ</p>
                  <p className="text-xs mt-1">Thông tin sẽ được cập nhật bởi cấp Tỉnh</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Certificate Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border">
                    <div>
                      <p className="text-xs text-gray-500">Số giấy chứng nhận</p>
                      <p className="font-medium text-sm">{linkedParcel.certificate?.certificate_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Số vào sổ</p>
                      <p className="font-medium text-sm">{linkedParcel.certificate?.certificate_book_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ngày cấp</p>
                      <p className="font-medium text-sm">
                        {linkedParcel.certificate?.issue_date
                          ? new Date(linkedParcel.certificate.issue_date).toLocaleDateString('vi-VN')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cơ quan cấp</p>
                      <p className="font-medium text-sm">{linkedParcel.certificate?.issuing_authority || '-'}</p>
                    </div>
                  </div>

                  {/* Parcel Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border">
                    <div>
                      <p className="text-xs text-gray-500">Mã thửa đất</p>
                      <p className="font-medium text-sm font-mono">{linkedParcel.parcel_code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Số tờ bản đồ</p>
                      <p className="font-medium text-sm">{linkedParcel.sheet_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Số thửa</p>
                      <p className="font-medium text-sm">{linkedParcel.parcel_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tổng diện tích</p>
                      <p className="font-medium text-sm">
                        {linkedParcel.total_area_m2?.toLocaleString('vi-VN')} m²
                      </p>
                    </div>
                  </div>

                  {/* Owners */}
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-blue-600" />
                      Chủ sở hữu ({linkedParcel.owners.length})
                    </h4>
                    <div className="space-y-2">
                      {linkedParcel.owners.map((owner, idx) => (
                        <div key={owner.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{owner.full_name}</p>
                              {owner.is_primary_contact && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                  Liên hệ chính
                                </span>
                              )}
                              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                {owner.owner_type === 'individual' ? 'Cá nhân' :
                                  owner.owner_type === 'organization' ? 'Tổ chức' : 'Hộ gia đình'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              {owner.id_number && (
                                <span className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {owner.id_number}
                                </span>
                              )}
                              {owner.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {owner.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          {owner.ownership_share != null && owner.ownership_share > 0 && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600">
                                {owner.ownership_share}%
                              </p>
                              <p className="text-xs text-gray-500">
                                {owner.ownership_type === 'owner' ? 'Sở hữu' :
                                  owner.ownership_type === 'co_owner' ? 'Đồng sở hữu' : 'Đại diện'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Land Uses */}
                  <div className="p-4 bg-white rounded-lg border">
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                      <TreePine className="h-4 w-4 text-green-600" />
                      Mục đích sử dụng đất ({linkedParcel.land_uses.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Mã loại đất</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Mục đích sử dụng</th>
                            <th className="text-right py-2 px-3 font-medium text-gray-700">Diện tích</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Thời hạn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linkedParcel.land_uses.map((use) => (
                            <tr key={use.id} className="border-b last:border-0">
                              <td className="py-2 px-3 font-mono">{use.land_use_type_code}</td>
                              <td className="py-2 px-3">{use.land_use_purpose || LAND_USE_TYPES[use.land_use_type_code] || '-'}</td>
                              <td className="py-2 px-3 text-right font-medium">
                                {use.area_m2.toLocaleString('vi-VN')} m²
                              </td>
                              <td className="py-2 px-3">
                                {use.use_term_type === 'permanent' ? (
                                  <span className="text-green-600">Lâu dài</span>
                                ) : use.use_end_date ? (
                                  <span className="text-amber-600">
                                    đến {new Date(use.use_end_date).toLocaleDateString('vi-VN')}
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Commune officers cannot unlink - removed unlink button */}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Representative Contact (optional) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-gray-600" />
                Người liên hệ khi khảo sát
                <span className="text-xs font-normal text-gray-500">(Tùy chọn)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Thông tin liên hệ được ghi nhận tại địa điểm. Đây không phải chủ sở hữu chính thức
                (thông tin chủ sở hữu được lấy từ giấy chứng nhận QSDĐ ở trên).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên người liên hệ</label>
                  <input
                    type="text"
                    value={survey.representative_name || ''}
                    onChange={(e) => !isReadOnly && setSurvey({ ...survey, representative_name: e.target.value })}
                    className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="(Tùy chọn)"
                    readOnly={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Số CMND/CCCD</label>
                  <input
                    type="text"
                    value={survey.representative_id_number || ''}
                    onChange={(e) => !isReadOnly && setSurvey({ ...survey, representative_id_number: e.target.value })}
                    className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="(Tùy chọn)"
                    readOnly={isReadOnly}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                  <input
                    type="text"
                    value={survey.representative_phone || ''}
                    onChange={(e) => !isReadOnly && setSurvey({ ...survey, representative_phone: e.target.value })}
                    className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder="(Tùy chọn)"
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Land Info */}
          {/* <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-amber-600" />
                Thông tin khảo sát
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <label className="text-sm font-medium text-gray-700">Diện tích khảo sát (m²)</label>
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
          </Card> */}

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
                onChange={(e) => !isReadOnly && setSurvey({ ...survey, notes: e.target.value })}
                rows={4}
                className={`block w-full rounded-md border border-gray-300 px-3 py-2 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="Thêm ghi chú về khảo sát này..."
                readOnly={isReadOnly}
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
                  wardBoundary={wardBoundary}
                  restrictToWardBoundary={!!wardBoundary}
                  showSearch={false}
                  showInfoCard={false}
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
                    onChange={(e) => !isReadOnly && setSurvey({ ...survey, location_name: e.target.value })}
                    className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    readOnly={isReadOnly}
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
                disabled={survey.status === 'approved_central'}
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
