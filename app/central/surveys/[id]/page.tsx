'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { QualityScore, calculateQualityScore } from '@/components/ui/quality-score'
import { ArrowLeft, CheckCircle, XCircle, MapPin, User, FileText, Clock, Camera, History, LogIn, Users, TreePine, CreditCard, Phone } from 'lucide-react'
import { getParcelWithDetails, LAND_USE_TYPES } from '@/lib/services/certificate-service'
import type { LandParcelWithDetails } from '@/lib/types/database'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import Image from 'next/image'
import { Database } from '@/lib/types/database'
import { toast } from 'sonner'
import { EntryPointsSection } from '@/components/survey/entry-points-section'
import { EntryPoint } from '@/lib/types/entry-points'
import { getEntryPoints } from '@/lib/services/entry-points-service'
import { RejectSurveyModal, RejectionData, REJECTION_REASONS } from '@/components/survey/reject-survey-modal'

const EnhancedSurveyMap = nextDynamic(
  () => import('@/components/map/enhanced-survey-map').then(mod => mod.EnhancedSurveyMap),
  {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Đang tải bản đồ...</div>
  }
)

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']
type ApprovalHistory = Database['public']['Tables']['approval_history']['Row']

export default function CentralSurveyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { webUser, user } = useAuth()
  const [survey, setSurvey] = useState<SurveyLocation | null>(null)
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([])
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([])
  const [linkedParcel, setLinkedParcel] = useState<LandParcelWithDetails | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchData() {
      if (!params?.id) {
        setLoading(false)
        return
      }


      try {
        // Fetch survey
        const { data: surveyData, error: surveyError } = await supabase
          .from('survey_locations')
          .select('*')
          .eq('id', params.id as string)
          .abortSignal(abortController.signal)
          .single()

        if (surveyError) {
          if (surveyError.code !== 'PGRST116') {
            throw surveyError
          }
        }

        // Fetch approval history
        const { data: historyData, error: historyError } = await supabase
          .from('approval_history')
          .select('*')
          .eq('survey_location_id', params.id as string)
          .order('created_at', { ascending: false })
          .abortSignal(abortController.signal)

        if (historyError) {
          console.error('Error fetching approval history:', historyError)
        }

        if (mounted) {
          setSurvey(surveyData)
          setApprovalHistory(historyData || [])

          // Fetch entry points for this survey
          if (surveyData?.id) {
            const entryPointsData = await getEntryPoints(surveyData.id)
            if (mounted) {
              setEntryPoints(entryPointsData)
            }
          }

          // Fetch linked parcel if exists
          if (surveyData?.land_parcel_id) {
            const parcelData = await getParcelWithDetails(surveyData.land_parcel_id)
            if (mounted && parcelData) {
              setLinkedParcel(parcelData)
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching data:', error)
          if (mounted) {
            toast.error("Lỗi", {
              description: "Không thể tải thông tin khảo sát.",
            })
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [params?.id])

  const handleApprove = async () => {
    if (!survey || !user) return
    setSaving(true)

    try {
      const { error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'approved_central',
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (updateError) throw updateError

      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          survey_location_id: survey.id,
          action: 'approved',
          actor_id: user.id,
          actor_role: webUser?.role || 'central_admin',
          previous_status: survey.status,
          new_status: 'approved_central',
          notes: notes || 'Approved by central admin',
        })

      if (historyError) throw historyError

      toast.success("Thành công", {
        description: "Đã phê duyệt khảo sát!",
      })
      router.push('/central/surveys')
    } catch (error) {
      console.error('Error approving survey:', error)
      toast.error("Lỗi", {
        description: "Lỗi khi phê duyệt!",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async (rejectionData: RejectionData) => {
    if (!survey || !user) {
      return
    }
    setSaving(true)

    try {
      // Build rejection notes with reason
      let rejectionNotes = `[${rejectionData.reasonLabel}]`
      if (rejectionData.customReason) {
        rejectionNotes += ` ${rejectionData.customReason}`
      }
      if (rejectionData.notes) {
        rejectionNotes += ` - ${rejectionData.notes}`
      }

      const { error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (updateError) throw updateError

      // Store rejection data in metadata for easier parsing on app side
      const metadata = {
        rejection_reason_id: rejectionData.reasonId,
        rejection_reason_label: rejectionData.reasonLabel,
        rejection_custom_reason: rejectionData.customReason || null,
        rejection_additional_notes: rejectionData.notes || null
      }

      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          survey_location_id: survey.id,
          action: 'rejected',
          actor_id: user.id,
          actor_role: webUser?.role || 'central_admin',
          previous_status: survey.status,
          new_status: 'rejected',
          notes: rejectionNotes,
          metadata: metadata,
        })

      if (historyError) throw historyError

      setShowRejectModal(false)
      toast.success("Thành công", {
        description: "Đã từ chối khảo sát!",
      })
      router.push('/central/surveys')
    } catch (error) {
      console.error('Error rejecting survey:', error)
      toast.error("Lỗi", {
        description: "Lỗi khi từ chối!",
      })
    } finally {
      setSaving(false)
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      submitted: 'Đã gửi',
      reviewed: 'Đã xem xét',
      approved: 'Đã phê duyệt',
      rejected: 'Đã từ chối',
    }
    return labels[action] || action
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-700',
      reviewed: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    }
    return colors[action] || 'bg-gray-100 text-gray-700'
  }

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
          <p className="text-red-600 text-lg font-medium">Không tìm thấy khảo sát</p>
          <Link href="/central/surveys">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại danh sách
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const qualityScore = calculateQualityScore(survey)
  const canApprove = survey.status === 'approved_commune'
  const isFinalized = survey.status === 'approved_central' || survey.status === 'rejected'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/central/surveys">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {survey.location_name || 'Chi tiết khảo sát'}
            </h1>
            <p className="text-gray-500 mt-1">
              ID: {survey.id.substring(0, 8)}... | Mã định danh: {survey.location_identifier || 'Chưa gán'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <QualityScore score={qualityScore.total} size="lg" />
          <StatusBadge status={survey.status} />
        </div>
      </div>

      {/* Map Section */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Bản đồ vị trí
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] rounded-b-lg overflow-hidden">
            <EnhancedSurveyMap
              surveys={[survey]}
              center={survey.latitude && survey.longitude ? [survey.latitude, survey.longitude] : undefined}
              zoom={16}
              showHeatmap={false}
              showClustering={false}
              enableDrawing={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Info Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Location Info */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Thông tin vị trí
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tên vị trí</p>
                <p className="font-medium">{survey.location_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Loại đối tượng</p>
                <p className="font-medium">{survey.object_type || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Địa chỉ</p>
              <p className="font-medium">{survey.address || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Vĩ độ</p>
                <p className="font-medium font-mono">{survey.latitude}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kinh độ</p>
                <p className="font-medium font-mono">{survey.longitude}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mã thửa đất</p>
              <p className="font-medium">{survey.parcel_code || '-'}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Mã tỉnh</p>
                <p className="font-medium">{survey.province_code || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mã huyện</p>
                <p className="font-medium">{survey.district_code || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mã xã</p>
                <p className="font-medium">{survey.ward_code || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Representative Contact & Notes */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-600" />
              Người liên hệ khi khảo sát
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-gray-500 italic">
              Thông tin liên hệ ghi nhận tại hiện trường (không phải chủ sở hữu chính thức)
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tên người liên hệ</p>
                <p className="font-medium">{survey.representative_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Số CMND/CCCD</p>
                <p className="font-medium font-mono">{survey.representative_id_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Số điện thoại</p>
                <p className="font-medium">{survey.representative_phone || '-'}</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">Ghi chú</p>
              <p className="font-medium whitespace-pre-wrap">{survey.notes || 'Không có ghi chú'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Land Certificate & Parcel Info */}
      {linkedParcel ? (
        <Card className="shadow-lg border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Giấy chứng nhận QSDĐ
              <span className="ml-2 text-sm font-normal text-green-700 bg-green-100 px-2 py-0.5 rounded">
                Đã liên kết
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
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
                Chủ sở hữu chính thức ({linkedParcel.owners.length})
              </h4>
              <div className="space-y-2">
                {linkedParcel.owners.map((owner) => (
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
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-2 border-amber-200">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Giấy chứng nhận QSDĐ
              <span className="ml-2 text-sm font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                Chưa liên kết
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500 py-4">
              Khảo sát này chưa được liên kết với giấy chứng nhận QSDĐ.
              Thông tin chủ sở hữu chính thức chưa được xác minh.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Photos Section */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-orange-600" />
            Ảnh khảo sát ({survey.photos?.length || 0} ảnh)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {survey.photos && survey.photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {survey.photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Image
                    src={photo}
                    alt={`Survey photo ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có ảnh khảo sát</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedPhoto}
              alt="Survey photo"
              fill
              className="object-contain"
              unoptimized
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Entry Points Section */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-green-600" />
            Lối vào ({entryPoints.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {entryPoints.length > 0 ? (
            <EntryPointsSection entryPoints={entryPoints} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <LogIn className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có thông tin lối vào</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Score Breakdown */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Phân tích chất lượng
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Độ chính xác GPS</p>
              <p className="text-2xl font-bold text-blue-600">{qualityScore.breakdown.gpsAccuracy}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Chất lượng ảnh</p>
              <p className="text-2xl font-bold text-green-600">{qualityScore.breakdown.photoQuality}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Độ đầy đủ</p>
              <p className="text-2xl font-bold text-purple-600">{qualityScore.breakdown.completeness}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Tổng điểm</p>
              <p className="text-2xl font-bold text-orange-600">{qualityScore.total}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval History */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-600" />
            Lịch sử phê duyệt
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {approvalHistory.length > 0 ? (
            <div className="space-y-4">
              {approvalHistory.map((history, index) => (
                <div key={history.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(history.action)}`}>
                    {getActionLabel(history.action)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{history.actor_role}</span>
                      {history.notes && <span className="ml-2">- {history.notes}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(history.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400">
                    {history.previous_status} → {history.new_status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có lịch sử phê duyệt</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Section */}
      {!isFinalized && (
        <Card className="shadow-lg border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Hành động phê duyệt
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Ghi chú / Lý do (bắt buộc khi từ chối)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập ghi chú hoặc lý do từ chối..."
              />
            </div>

            <div className="flex gap-4 pt-2">
              {canApprove && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={saving}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {saving ? 'Đang xử lý...' : 'Phê duyệt cấp trung ương'}
                  </Button>

                  <Button
                    onClick={() => setShowRejectModal(true)}
                    disabled={saving}
                    variant="destructive"
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    {saving ? 'Đang xử lý...' : 'Từ chối'}
                  </Button>
                </>
              )}

              {!canApprove && (
                <p className="text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                  Khảo sát này đang ở trạng thái <strong>{survey.status}</strong> và chưa sẵn sàng để phê duyệt cấp trung ương.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Thông tin hệ thống</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Ngày tạo</p>
              <p className="font-medium">{new Date(survey.created_at).toLocaleString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-gray-500">Cập nhật lần cuối</p>
              <p className="font-medium">{new Date(survey.updated_at).toLocaleString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-gray-500">ID đầy đủ</p>
              <p className="font-medium font-mono text-xs">{survey.id}</p>
            </div>
            <div>
              <p className="text-gray-500">Người khảo sát</p>
              <p className="font-medium font-mono text-xs">{survey.surveyor_id || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Survey Modal */}
      <RejectSurveyModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleReject}
        surveyName={survey.location_name || 'Chưa đặt tên'}
        isLoading={saving}
      />
    </div>
  )
}
