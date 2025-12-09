'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, MapPin, Eye, XCircle } from 'lucide-react'
import { RejectSurveyModal, RejectionData } from '@/components/survey/reject-survey-modal'
import Link from 'next/link'
import { Database } from '@/lib/types/database'
import { toast } from 'sonner'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface ApprovalsClientProps {
  initialSurveys: SurveyLocation[]
}

export function ApprovalsClient({ initialSurveys }: ApprovalsClientProps) {
  const { webUser, user } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>(initialSurveys)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectingSurvey, setRejectingSurvey] = useState<SurveyLocation | null>(null)
  const supabase = createClient()

  /**
   * Generate location identifier with random number
   * Format: PPWWWWNNNNNN (12 digits, no dashes)
   * - PP: Province code (2 digits, zero-padded)
   * - WWWW: Ward code (4 digits, zero-padded)
   * - NNNNNN: Random number (6 digits)
   */
  const handleApprove = async (survey: SurveyLocation) => {
    if (!user) return
    setProcessing(survey.id)

    try {
      const provinceCode = (survey.province_id || 0).toString().padStart(2, '0')
      const wardCode = (survey.ward_id || 0).toString().padStart(4, '0')
      const adminCode = `${provinceCode}${wardCode}`

      // Generate random number and retry if duplicate
      const maxRetries = 10
      let locationId: string | null = null
      let inserted = false

      for (let attempt = 0; attempt < maxRetries && !inserted; attempt++) {
        const randomNum = Math.floor(Math.random() * 999999) + 1
        const randomStr = randomNum.toString().padStart(6, '0')
        locationId = `${adminCode}${randomStr}`

        const { error: insertError } = await supabase
          .from('location_identifiers')
          .insert({
            survey_location_id: survey.id,
            location_id: locationId,
            admin_code: adminCode,
            sequence_number: randomStr,
            assigned_by: user.id,
          })

        if (!insertError) {
          inserted = true
        } else if (insertError.code !== '23505') {
          throw insertError
        }
        // If duplicate (23505), loop will retry with new random number
      }

      if (!inserted || !locationId) {
        throw new Error('Không thể tạo mã định danh sau nhiều lần thử')
      }

      // Update survey_locations with new status and location_identifier
      const { error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'approved_central',
          location_identifier: locationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (updateError) throw updateError

      // Log approval history
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          survey_location_id: survey.id,
          action: 'approved',
          actor_id: user.id,
          actor_role: webUser?.role || 'central_admin',
          previous_status: survey.status,
          new_status: 'approved_central',
          notes: `Đã phê duyệt cấp trung ương. Mã định danh: ${locationId}`,
        })

      if (historyError) throw historyError

      setSurveys(surveys.filter(s => s.id !== survey.id))
      toast.success("Thành công", {
        description: `Đã phê duyệt! Mã định danh: ${locationId}`,
      })
    } catch (error: any) {
      console.error('Error approving survey:', error)
      toast.error("Lỗi", {
        description: error?.message || "Lỗi khi phê duyệt!",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (rejectionData: RejectionData) => {
    if (!rejectingSurvey || !user) return
    setProcessing(rejectingSurvey.id)

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
        .eq('id', rejectingSurvey.id)

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
          survey_location_id: rejectingSurvey.id,
          action: 'rejected',
          actor_id: user.id,
          actor_role: webUser?.role || 'central_admin',
          previous_status: rejectingSurvey.status,
          new_status: 'rejected',
          notes: rejectionNotes,
          metadata: metadata,
        })

      if (historyError) throw historyError

      setSurveys(surveys.filter(s => s.id !== rejectingSurvey.id))
      setRejectingSurvey(null)
      toast.success("Thành công", {
        description: "Đã từ chối khảo sát!",
      })
    } catch (error) {
      console.error('Error rejecting survey:', error)
      toast.error("Lỗi", {
        description: "Lỗi khi từ chối!",
      })
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Phê duyệt Trung ương</h1>
        <p className="text-gray-500 mt-1">
          Phê duyệt và cấp mã định danh cho các khảo sát
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chờ phê duyệt ({surveys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {surveys.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Không có khảo sát nào chờ phê duyệt
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Tên vị trí
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Địa chỉ
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Mã vùng (Tỉnh-Xã)
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Chủ sở hữu
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Trạng thái
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((survey) => (
                    <tr key={survey.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {survey.location_name || 'Chưa đặt tên'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {survey.address || 'Chưa có địa chỉ'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono">
                        {survey.province_id?.toString().padStart(2, '0') || '??'}-{survey.ward_id?.toString().padStart(4, '0') || '????'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {survey.owner_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={survey.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/central/surveys/${survey.id}`}>
                            <Button size="sm" variant="outline" className="gap-1">
                              <Eye className="h-4 w-4" />
                              Xem
                            </Button>
                          </Link>
                          <Button
                            onClick={() => handleApprove(survey)}
                            disabled={processing === survey.id}
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            {processing === survey.id ? (
                              <>Đang xử lý...</>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Duyệt
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => setRejectingSurvey(survey)}
                            disabled={processing === survey.id}
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                          >
                            <XCircle className="h-4 w-4" />
                            Từ chối
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Quy tắc cấp mã định danh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Format:</strong> PPWWWWNNNNNN (12 chữ số)</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>PP:</strong> Mã tỉnh (2 chữ số, ví dụ: 04, 23)</li>
              <li><strong>WWWW:</strong> Mã xã (4 chữ số, ví dụ: 0028, 1234)</li>
              <li><strong>NNNNNN:</strong> Số ngẫu nhiên (6 chữ số)</li>
            </ul>
            <p className="mt-2 text-gray-600">
              Ví dụ: <code className="bg-gray-100 px-2 py-1 rounded font-mono">040028847291</code>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Số ngẫu nhiên được tạo tự động và đảm bảo không trùng lặp
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reject Survey Modal */}
      <RejectSurveyModal
        isOpen={!!rejectingSurvey}
        onClose={() => setRejectingSurvey(null)}
        onConfirm={handleReject}
        surveyName={rejectingSurvey?.location_name || 'Chưa đặt tên'}
        isLoading={processing === rejectingSurvey?.id}
      />
    </div>
  )
}
