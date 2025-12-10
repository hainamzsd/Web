'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  Phone,
  CreditCard,
  Navigation,
  Ruler,
  Calendar,
  FileText,
  LogIn,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/types/database'
import { EntryPointsSection } from '@/components/survey/entry-points-section'
import { EntryPoint } from '@/lib/types/entry-points'
import { getEntryPoints } from '@/lib/services/entry-points-service'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function ReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { webUser, user, loading: authLoading } = useAuth()
  const [survey, setSurvey] = useState<SurveyLocation | null>(null)
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (authLoading) return

    async function fetchSurvey() {
      if (!params.id) return

      try {
        const { data, error } = await supabase
          .from('survey_locations')
          .select('*')
          .eq('id', params.id as string)
          .single()

        if (error) throw error
        setSurvey(data)

        // Fetch entry points
        if (data?.id) {
          const entryPointsData = await getEntryPoints(data.id)
          setEntryPoints(entryPointsData)
        }
      } catch (error) {
        console.error('Error fetching survey:', error)
        toast.error('Lỗi', { description: 'Không thể tải thông tin khảo sát' })
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [params.id, authLoading])

  const handleApprove = async () => {
    if (!survey || !user) return

    const confirmed = window.confirm(
      `Bạn có chắc muốn phê duyệt khảo sát "${survey.location_name || 'Chưa đặt tên'}"?`
    )
    if (!confirmed) return

    setSaving(true)

    try {
      const { data, error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'approved_commune',
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)
        .select()

      if (updateError) throw updateError

      if (!data || data.length === 0) {
        throw new Error('Không thể cập nhật. Có thể bạn không có quyền.')
      }

      await supabase
        .from('approval_history')
        .insert({
          survey_location_id: survey.id,
          action: 'approved',
          actor_id: user.id,
          actor_role: webUser?.role || 'commune_supervisor',
          previous_status: survey.status,
          new_status: 'approved_commune',
          notes: notes || 'Đã phê duyệt bởi giám sát viên',
        })

      toast.success('Phê duyệt thành công!', {
        description: `Khảo sát "${survey.location_name || 'Chưa đặt tên'}" đã được phê duyệt.`,
        duration: 5000,
      })

      setTimeout(() => {
        router.push('/supervisor/reviews')
      }, 1500)
    } catch (error: any) {
      console.error('Error approving survey:', error)
      toast.error('Lỗi', { description: error?.message || 'Lỗi khi phê duyệt!' })
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!survey || !user) return

    if (!notes.trim()) {
      toast.error('Yêu cầu ghi chú', { description: 'Vui lòng nhập lý do từ chối' })
      return
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn từ chối khảo sát "${survey.location_name || 'Chưa đặt tên'}"?`
    )
    if (!confirmed) return

    setSaving(true)

    try {
      const { data, error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)
        .select()

      if (updateError) throw updateError

      if (!data || data.length === 0) {
        throw new Error('Không thể cập nhật. Có thể bạn không có quyền.')
      }

      await supabase
        .from('approval_history')
        .insert({
          survey_location_id: survey.id,
          action: 'rejected',
          actor_id: user.id,
          actor_role: webUser?.role || 'commune_supervisor',
          previous_status: survey.status,
          new_status: 'rejected',
          notes: notes,
        })

      toast.success('Đã từ chối', {
        description: `Khảo sát "${survey.location_name || 'Chưa đặt tên'}" đã bị từ chối.`,
        duration: 5000,
      })

      setTimeout(() => {
        router.push('/supervisor/reviews')
      }, 1500)
    } catch (error: any) {
      console.error('Error rejecting survey:', error)
      toast.error('Lỗi', { description: error?.message || 'Lỗi khi từ chối!' })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"><Clock className="h-3.5 w-3.5" />Chờ xử lý</span>
      case 'reviewed':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"><FileText className="h-3.5 w-3.5" />Đã xem xét</span>
      case 'approved_commune':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><CheckCircle2 className="h-3.5 w-3.5" />Đã duyệt</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><XCircle className="h-3.5 w-3.5" />Từ chối</span>
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-gray-500">Không tìm thấy khảo sát</p>
        <Link href="/supervisor/reviews">
          <Button variant="outline">Quay lại danh sách</Button>
        </Link>
      </div>
    )
  }

  const canTakeAction = survey.status === 'pending' || survey.status === 'reviewed'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/supervisor/reviews">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {survey.location_name || 'Khảo sát chưa đặt tên'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {survey.address || 'Chưa có địa chỉ'}
            </p>
          </div>
        </div>
        {getStatusBadge(survey.status)}
      </div>

      {/* Info Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Location Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Thông tin vị trí
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Tên vị trí</p>
                <p className="text-sm font-medium">{survey.location_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Loại đối tượng</p>
                <p className="text-sm font-medium">{survey.object_type || '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Địa chỉ</p>
              <p className="text-sm font-medium">{survey.address || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Tọa độ</p>
                  <p className="text-xs font-mono">{survey.latitude.toFixed(6)}, {survey.longitude.toFixed(6)}</p>
                </div>
              </div>
              {survey.accuracy && (
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Độ chính xác</p>
                    <p className="text-sm font-medium">±{survey.accuracy.toFixed(2)}m</p>
                  </div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Representative Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              Người liên hệ khi khảo sát
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500 italic">
              Thông tin liên hệ ghi nhận tại hiện trường (không phải chủ sở hữu chính thức)
            </p>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Họ tên</p>
                <p className="text-sm font-medium">{(survey as any).representative_name || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">CMND/CCCD</p>
                <p className="text-sm font-medium">{(survey as any).representative_id_number || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Số điện thoại</p>
                <p className="text-sm font-medium">{(survey as any).representative_phone || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Ngày tạo</p>
                <p className="text-sm font-medium">
                  {new Date(survey.created_at).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entry Points */}
      {entryPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LogIn className="h-4 w-4 text-green-600" />
              Lối vào ({entryPoints.length})
            </CardTitle>
            <CardDescription>Danh sách các lối vào đã được ghi nhận</CardDescription>
          </CardHeader>
          <CardContent>
            <EntryPointsSection entryPoints={entryPoints} />
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {survey.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-600" />
              Ghi chú từ khảo sát viên
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{survey.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Review Section */}
      {canTakeAction && (
        <Card className="border-2 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Xem xét và phê duyệt</CardTitle>
            <CardDescription>Nhập ghi chú (bắt buộc nếu từ chối) và chọn hành động</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập ghi chú hoặc lý do từ chối..."
            />

            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={saving}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'Đang xử lý...' : 'Phê duyệt'}
              </Button>

              <Button
                onClick={handleReject}
                disabled={saving}
                variant="destructive"
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                {saving ? 'Đang xử lý...' : 'Từ chối'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already Processed */}
      {!canTakeAction && (
        <Card className="bg-gray-50">
          <CardContent className="py-6">
            <div className="text-center text-gray-500">
              <p>Khảo sát này đã được xử lý.</p>
              <p className="text-sm mt-1">Trạng thái hiện tại: {getStatusBadge(survey.status)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
