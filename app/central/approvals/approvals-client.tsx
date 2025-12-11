'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Eye, MapPin, FileCheck, AlertTriangle, Search } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface ApprovalsClientProps {
  initialSurveys: SurveyLocation[]
}

export function ApprovalsClient({ initialSurveys }: ApprovalsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter surveys by search term
  const filteredSurveys = initialSurveys.filter(survey => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      survey.location_name?.toLowerCase().includes(search) ||
      survey.address?.toLowerCase().includes(search) ||
      survey.parcel_code?.toLowerCase().includes(search)
    )
  })

  // Check if survey has land parcel linked
  const hasLandParcel = (survey: SurveyLocation) => {
    return !!survey.land_parcel_id && !!survey.parcel_verified_at
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Phê duyệt Trung ương</h1>
        <p className="text-gray-500 mt-1">
          Tra cứu thửa đất và cấp mã định danh cho các khảo sát đã được Tỉnh phê duyệt
        </p>
      </div>

      {/* Workflow Info */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-indigo-900">Quy trình phê duyệt TW</h4>
              <p className="text-sm text-indigo-700 mt-1">
                1. Xem chi tiết khảo sát → 2. Tra cứu và liên kết thửa đất → 3. Phê duyệt và cấp mã định danh
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chờ phê duyệt ({filteredSurveys.length})</CardTitle>
              <CardDescription>Nhấn "Xem chi tiết" để tra cứu thửa đất và phê duyệt</CardDescription>
            </div>
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, địa chỉ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSurveys.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {searchTerm ? 'Không tìm thấy kết quả' : 'Không có khảo sát nào chờ phê duyệt'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tên vị trí</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Địa chỉ</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Mã vùng</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Thửa đất</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurveys.map((survey) => {
                    const linked = hasLandParcel(survey)
                    return (
                      <tr key={survey.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{survey.location_name || 'Chưa đặt tên'}</div>
                          {survey.parcel_code && (
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                              Thửa: {survey.parcel_code}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                          {survey.address || 'Chưa có địa chỉ'}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono">
                          {survey.province_id?.toString().padStart(2, '0') || '??'}-
                          {survey.ward_id?.toString().padStart(4, '0') || '????'}
                        </td>
                        <td className="py-3 px-4">
                          {linked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FileCheck className="h-3 w-3" />
                              Đã liên kết
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <AlertTriangle className="h-3 w-3" />
                              Chưa liên kết
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {survey.status === 'approved_commune' ? 'Đã duyệt (Xã cũ)' : 'Đã duyệt (Tỉnh)'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/central/surveys/${survey.id}`}>
                            <Button size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700">
                              <Eye className="h-4 w-4" />
                              Xem chi tiết
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
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
              <li><strong>PP:</strong> Mã tỉnh (2 chữ số)</li>
              <li><strong>WWWW:</strong> Mã xã (4 chữ số)</li>
              <li><strong>NNNNNN:</strong> Số ngẫu nhiên (6 chữ số)</li>
            </ul>
            <p className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <strong>Lưu ý:</strong> Phải tra cứu và liên kết thửa đất trong màn hình chi tiết trước khi có thể cấp mã định danh.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
