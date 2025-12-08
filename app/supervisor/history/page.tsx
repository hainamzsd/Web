'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Filter,
  History,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Award,
  Globe
} from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

const PAGE_SIZE = 10

export default function HistoryPage() {
  const { webUser, loading: authLoading } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const supabase = createClient()

  const fetchHistory = async () => {
    if (!webUser) return

    setLoading(true)
    try {
      let query = supabase
        .from('survey_locations')
        .select('*')
        .in('status', ['approved_commune', 'rejected', 'approved_central', 'published'])
        .order('updated_at', { ascending: false })

      // Filter by ward_id first, then province_id, then province_code
      if (webUser.ward_id) {
        query = query.eq('ward_id', webUser.ward_id)
      } else if (webUser.province_id) {
        query = query.eq('province_id', webUser.province_id)
      } else if (webUser.province_code) {
        query = query.eq('province_code', webUser.province_code)
      }

      const { data, error } = await query

      if (error) throw error
      setSurveys(data || [])
      setFilteredSurveys(data || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    fetchHistory()
  }, [webUser, authLoading])

  useEffect(() => {
    let result = surveys

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(s =>
        (s.location_name?.toLowerCase().includes(term)) ||
        (s.address?.toLowerCase().includes(term)) ||
        (s.owner_name?.toLowerCase().includes(term)) ||
        (s.location_identifier?.toLowerCase().includes(term))
      )
    }

    setFilteredSurveys(result)
    setCurrentPage(1)
  }, [searchTerm, statusFilter, surveys])

  const totalPages = Math.ceil(filteredSurveys.length / PAGE_SIZE)
  const paginatedSurveys = filteredSurveys.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved_commune':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            Đã duyệt (Xã)
          </span>
        )
      case 'approved_central':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Award className="h-3 w-3" />
            Đã duyệt (TW)
          </span>
        )
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Globe className="h-3 w-3" />
            Đã công bố
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            Từ chối
          </span>
        )
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Stats
  const statsApproved = surveys.filter(s => s.status === 'approved_commune').length
  const statsApprovedCentral = surveys.filter(s => s.status === 'approved_central').length
  const statsPublished = surveys.filter(s => s.status === 'published').length
  const statsRejected = surveys.filter(s => s.status === 'rejected').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lịch sử xem xét</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tất cả khảo sát đã được xử lý
          </p>
        </div>
        <Button onClick={fetchHistory} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-green-300 transition-colors" onClick={() => setStatusFilter('approved_commune')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Đã duyệt (Xã)</p>
                <p className="text-2xl font-bold text-green-600">{statsApproved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setStatusFilter('approved_central')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Đã duyệt (TW)</p>
                <p className="text-2xl font-bold text-blue-600">{statsApprovedCentral}</p>
              </div>
              <Award className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-purple-300 transition-colors" onClick={() => setStatusFilter('published')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Đã công bố</p>
                <p className="text-2xl font-bold text-purple-600">{statsPublished}</p>
              </div>
              <Globe className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-300 transition-colors" onClick={() => setStatusFilter('rejected')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Từ chối</p>
                <p className="text-2xl font-bold text-red-600">{statsRejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên, địa chỉ, mã định danh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="approved_commune">Đã duyệt (Xã)</option>
                <option value="approved_central">Đã duyệt (TW)</option>
                <option value="published">Đã công bố</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Hiển thị {paginatedSurveys.length} / {filteredSurveys.length} khảo sát</span>
        {filteredSurveys.length !== surveys.length && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            className="text-blue-600 hover:underline"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {paginatedSurveys.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có lịch sử xem xét</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thông tin
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chủ sở hữu
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã định danh
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày cập nhật
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedSurveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <Link href={`/supervisor/reviews/${survey.id}`} className="flex items-start gap-3 group">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {survey.location_name || 'Chưa đặt tên'}
                            </p>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {survey.address || 'Chưa có địa chỉ'}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {survey.owner_name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(survey.status)}
                      </td>
                      <td className="py-4 px-4">
                        {survey.location_identifier ? (
                          <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {survey.location_identifier}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-500">
                          {new Date(survey.updated_at).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Trang {currentPage} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
