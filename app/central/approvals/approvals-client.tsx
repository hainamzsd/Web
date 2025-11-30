'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, MapPin } from 'lucide-react'
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
  const supabase = createClient()

  const generateLocationId = (provinceCode: string, districtCode: string, wardCode: string) => {
    const p = (provinceCode || '00').slice(0, 2).padStart(2, '0')
    const c = (wardCode || '0000').slice(0, 4).padStart(4, '0')
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    return `${p}${c}${random}`
  }

  const handleApprove = async (survey: SurveyLocation) => {
    if (!user) return
    setProcessing(survey.id)

    try {
      const locationId = generateLocationId(
        survey.province_code || '01',
        survey.district_code || '001',
        survey.ward_code || '001'
      )

      const { error: updateError } = await supabase
        .from('survey_locations')
        .update({
          status: 'approved_central',
          location_identifier: locationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', survey.id)

      if (updateError) throw updateError

      const { error: idError } = await supabase
        .from('location_identifiers')
        .insert({
          survey_location_id: survey.id,
          location_id: locationId,
          admin_code: `${survey.province_code}-${survey.district_code}-${survey.ward_code}`,
          sequence_number: locationId.split('-').pop() || '000000',
          assigned_by: user.id,
        })

      if (idError) throw idError

      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          survey_location_id: survey.id,
          action: 'approved',
          actor_id: user.id,
          actor_role: webUser?.role || 'central_admin',
          previous_status: survey.status,
          new_status: 'approved_central',
          notes: `Approved by central admin. Location ID assigned: ${locationId}`,
        })

      if (historyError) throw historyError

      setSurveys(surveys.filter(s => s.id !== survey.id))
      toast.success("Thành công", {
        description: `Đã phê duyệt! Mã định danh: ${locationId}`,
      })
    } catch (error) {
      console.error('Error approving survey:', error)
      toast.error("Lỗi", {
        description: "Lỗi khi phê duyệt!",
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
                      Tỉnh/Huyện/Xã
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
                      <td className="py-3 px-4 text-sm">
                        {survey.province_code}/{survey.district_code}/{survey.ward_code}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {survey.owner_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={survey.status} />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          onClick={() => handleApprove(survey)}
                          disabled={processing === survey.id}
                          size="sm"
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          {processing === survey.id ? (
                            <>Đang xử lý...</>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Phê duyệt & Cấp mã
                            </>
                          )}
                        </Button>
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
            <p><strong>Format:</strong> PPCCCCRRRRRR (12 ký tự)</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>PP:</strong> Mã tỉnh (2 ký tự)</li>
              <li><strong>CCCC:</strong> Mã xã (4 ký tự)</li>
              <li><strong>RRRRRR:</strong> Mã ngẫu nhiên (6 chữ số)</li>
            </ul>
            <p className="mt-2 text-gray-600">
              Ví dụ: <code className="bg-gray-100 px-2 py-1 rounded">010001123456</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
