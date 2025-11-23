'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, FileSpreadsheet, Globe } from 'lucide-react'
import { exportToCSV, exportToGeoJSON } from '@/lib/export/csv-exporter'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export default function ReportsPage() {
  const { webUser } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [filteredSurveys, setFilteredSurveys] = useState<SurveyLocation[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [objectTypeFilter, setObjectTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchSurveys() {
      if (!webUser) return

      try {
        const { data, error } = await supabase
          .from('survey_locations')
          .select('*')
          .eq('ward_code', webUser.commune_code)
          .order('created_at', { ascending: false })

        if (error) throw error
        setSurveys(data || [])
        setFilteredSurveys(data || [])
      } catch (error) {
        console.error('Error fetching surveys:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSurveys()
  }, [webUser, supabase])

  useEffect(() => {
    let filtered = surveys

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    // Filter by object type
    if (objectTypeFilter) {
      filtered = filtered.filter(s => s.object_type === objectTypeFilter)
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(s => new Date(s.created_at) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(s => new Date(s.created_at) <= new Date(dateTo))
    }

    setFilteredSurveys(filtered)
  }, [surveys, statusFilter, objectTypeFilter, dateFrom, dateTo])

  const handleExportCSV = () => {
    if (filteredSurveys.length === 0) {
      alert('Không có dữ liệu để xuất!')
      return
    }
    const filename = `surveys-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(filteredSurveys, filename)
  }

  const handleExportGeoJSON = () => {
    if (filteredSurveys.length === 0) {
      alert('Không có dữ liệu để xuất!')
      return
    }
    const filename = `surveys-${new Date().toISOString().split('T')[0]}.geojson`
    exportToGeoJSON(filteredSurveys, filename)
  }

  const handleExportPDF = () => {
    alert('Chức năng xuất PDF đang được phát triển!')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Báo cáo</h1>
        <p className="text-gray-500 mt-1">
          Tạo và xuất báo cáo khảo sát ({filteredSurveys.length} / {surveys.length} bản ghi)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Báo cáo PDF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Tổng hợp tất cả khảo sát trong xã
            </p>
            <Button
              onClick={handleExportPDF}
              className="w-full gap-2"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Xuất PDF (Sắp ra mắt)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5" />
              Dữ liệu CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Dữ liệu đầy đủ định dạng bảng ({filteredSurveys.length} bản ghi)
            </p>
            <Button
              onClick={handleExportCSV}
              className="w-full gap-2"
              disabled={filteredSurveys.length === 0}
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5" />
              Dữ liệu GIS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Dữ liệu không gian địa lý ({filteredSurveys.length} điểm)
            </p>
            <Button
              onClick={handleExportGeoJSON}
              className="w-full gap-2"
              disabled={filteredSurveys.length === 0}
            >
              <Download className="h-4 w-4" />
              Xuất GeoJSON
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tùy chọn báo cáo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Khoảng thời gian
            </label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ xử lý</option>
              <option value="reviewed">Đã xem xét</option>
              <option value="approved_commune">Xã đã duyệt</option>
              <option value="approved_central">Trung ương đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Loại đối tượng
            </label>
            <select
              value={objectTypeFilter}
              onChange={(e) => setObjectTypeFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Tất cả</option>
              <option value="house">Nhà ở</option>
              <option value="apartment">Chung cư</option>
              <option value="factory">Nhà máy</option>
              <option value="warehouse">Kho bãi</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
