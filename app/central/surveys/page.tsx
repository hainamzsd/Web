'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { QualityScore, calculateQualityScore } from '@/components/ui/quality-score'
import { FileText, Search, Filter, Eye, MapPin, Clock, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Database } from '@/lib/types/database'
import { EntryPointsBadge } from '@/components/survey/entry-points-section'
import { getEntryPointCounts } from '@/lib/services/entry-points-service'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function CentralSurveysPage() {
  const { webUser } = useAuth()
  const router = useRouter()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyLocation[]>([])
  const [entryPointCounts, setEntryPointCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchSurveys() {
      if (!webUser) {
        setLoading(false)
        router.push('/login')
        return
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const { data, error } = await supabase
          .from('survey_locations')
          .select('*')
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal)

        clearTimeout(timeoutId)

        if (error) throw error
        setSurveys(data || [])
        setFilteredSurveys(data || [])

        // Fetch entry point counts
        if (data && data.length > 0) {
          const surveyIds = data.map(s => s.id)
          const counts = await getEntryPointCounts(surveyIds)
          setEntryPointCounts(counts)
        }
      } catch (error) {
        console.error('Error fetching surveys:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSurveys()
  }, [webUser]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let filtered = surveys

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s =>
        s.location_name?.toLowerCase().includes(term) ||
        s.address?.toLowerCase().includes(term) ||
        s.owner_name?.toLowerCase().includes(term) ||
        s.location_identifier?.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
      )
    }

    if (statusFilter) {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    if (provinceFilter) {
      filtered = filtered.filter(s => s.province_code === provinceFilter)
    }

    setFilteredSurveys(filtered)
  }, [surveys, searchTerm, statusFilter, provinceFilter])

  const uniqueProvinces = [...new Set(surveys.map(s => s.province_code).filter(Boolean))]
  const statusCounts = surveys.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 -m-6 mb-6 p-6 rounded-lg text-white">
        <h1 className="text-3xl font-bold">Tất cả khảo sát</h1>
        <p className="text-indigo-100 mt-1">
          Quản lý và xem chi tiết tất cả khảo sát trên toàn quốc
        </p>
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="text-sm text-indigo-100">Tổng số</div>
            <div className="text-2xl font-bold">{surveys.length}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="text-sm text-indigo-100">Chờ duyệt TW</div>
            <div className="text-2xl font-bold">{statusCounts['approved_commune'] || 0}</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="text-sm text-indigo-100">Đã xuất bản</div>
            <div className="text-2xl font-bold">{statusCounts['published'] || 0}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, địa chỉ, chủ sở hữu, mã định danh..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="reviewed">Đã xem xét</option>
                <option value="approved_commune">Đã duyệt xã</option>
                <option value="approved_central">Đã duyệt TW</option>
                <option value="published">Đã xuất bản</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>
            <div>
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Tất cả tỉnh</option>
                {uniqueProvinces.map(code => (
                  <option key={code} value={code || ''}>Tỉnh {code}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Survey List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Danh sách khảo sát ({filteredSurveys.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSurveys.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Không tìm thấy khảo sát nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tên vị trí</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Địa chỉ</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Mã định danh</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Chủ sở hữu</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Chất lượng</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Lối vào</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Ngày tạo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSurveys.map((survey) => {
                    const qualityScore = calculateQualityScore(survey)
                    return (
                      <tr key={survey.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{survey.location_name || 'Chưa đặt tên'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 max-w-[200px] truncate">
                          {survey.address || 'Chưa có địa chỉ'}
                        </td>
                        <td className="py-3 px-4">
                          {survey.location_identifier ? (
                            <code className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                              {survey.location_identifier}
                            </code>
                          ) : (
                            <span className="text-gray-400 text-sm">Chưa gán</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {survey.owner_name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <QualityScore score={qualityScore.total} size="sm" />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={survey.status} />
                        </td>
                        <td className="py-3 px-4">
                          <EntryPointsBadge count={entryPointCounts[survey.id] || 0} />
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(survey.created_at).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Link href={`/central/surveys/${survey.id}`}>
                            <Button size="sm" variant="outline" className="gap-2">
                              <Eye className="h-4 w-4" />
                              Xem
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
    </div>
  )
}
