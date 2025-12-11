'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Eye,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

const PAGE_SIZE = 10

export default function ReviewsPage() {
  const { webUser, loading: authLoading } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const supabase = createClient()

  const fetchSurveys = async () => {
    if (!webUser) return

    setLoading(true)
    try {
      let query = supabase
        .from('survey_locations')
        .select('*')
        // Tỉnh duyệt survey pending (và reviewed cho backward compatibility)
        .in('status', ['pending', 'reviewed'])
        .order('created_at', { ascending: false })

      // Tỉnh lọc theo province_id hoặc province_code (tất cả xã trong tỉnh)
      if (webUser.province_id) {
        query = query.eq('province_id', webUser.province_id)
      } else if (webUser.province_code) {
        query = query.eq('province_code', webUser.province_code)
      }

      const { data, error } = await query

      if (error) throw error
      setSurveys(data || [])
      setFilteredSurveys(data || [])
    } catch (error) {
      console.error('Error fetching surveys:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    fetchSurveys()
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
        (s.owner_name?.toLowerCase().includes(term))
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
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Chờ phê duyệt</span>
      case 'reviewed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">Đã xem xét (cũ)</span>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Phê duyệt cấp Tỉnh</h1>
          <p className="text-sm text-gray-500 mt-1">
            Danh sách khảo sát từ các xã trong tỉnh chờ phê duyệt
          </p>
        </div>
        <Button onClick={fetchSurveys} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên, địa chỉ, chủ sở hữu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-md border border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">Chờ phê duyệt</span>
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
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Không có khảo sát nào cần xem xét</p>
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
                      Ngày tạo
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedSurveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {survey.location_name || 'Chưa đặt tên'}
                            </p>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {survey.address || 'Chưa có địa chỉ'}
                            </p>
                          </div>
                        </div>
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
                        <span className="text-sm text-gray-500">
                          {new Date(survey.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link href={`/supervisor/reviews/${survey.id}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Xem xét
                          </Button>
                        </Link>
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
