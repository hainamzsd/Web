'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function ReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { webUser, user } = useAuth()
  const [survey, setSurvey] = useState<SurveyLocation | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
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
      } catch (error) {
        console.error('Error fetching survey:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [params.id, supabase])

  const handleApprove = async () => {
    if (!survey || !user) return
    setSaving(true)

    try {
      const { error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'approved_commune',
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
          actor_role: webUser?.role || 'commune_supervisor',
          previous_status: survey.status,
          new_status: 'approved_commune',
          notes: notes || 'Approved by supervisor',
        })

      if (historyError) throw historyError

      alert('Đã phê duyệt khảo sát!')
      router.push('/supervisor/reviews')
    } catch (error) {
      console.error('Error approving survey:', error)
      alert('Lỗi khi phê duyệt!')
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async () => {
    if (!survey || !user || !notes) {
      alert('Vui lòng nhập lý do từ chối')
      return
    }
    setSaving(true)

    try {
      const { error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (updateError) throw updateError

      const { error: historyError } = await supabase
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

      if (historyError) throw historyError

      alert('Đã từ chối khảo sát!')
      router.push('/supervisor/reviews')
    } catch (error) {
      console.error('Error rejecting survey:', error)
      alert('Lỗi khi từ chối!')
    } finally {
      setSaving(false)
    }
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
        <p className="text-red-600">Không tìm thấy khảo sát</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/supervisor/reviews">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Xem xét khảo sát
            </h1>
          </div>
        </div>
        <StatusBadge status={survey.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin vị trí</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Tên vị trí</p>
              <p className="font-medium">{survey.location_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Địa chỉ</p>
              <p className="font-medium">{survey.address || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Vĩ độ</p>
                <p className="font-medium">{survey.latitude}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kinh độ</p>
                <p className="font-medium">{survey.longitude}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin chủ sở hữu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Tên</p>
              <p className="font-medium">{survey.owner_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Số CMND/CCCD</p>
              <p className="font-medium">{survey.owner_id_number || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Số điện thoại</p>
              <p className="font-medium">{survey.owner_phone || '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ghi chú / Nhận xét</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Nhập ghi chú hoặc lý do từ chối..."
          />
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleApprove}
          disabled={saving}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4" />
          Phê duyệt
        </Button>

        <Button
          onClick={handleReject}
          disabled={saving}
          variant="destructive"
          className="gap-2"
        >
          <XCircle className="h-4 w-4" />
          Từ chối
        </Button>
      </div>
    </div>
  )
}
