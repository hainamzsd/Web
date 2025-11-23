'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Activity, MapPin, Users, Clock, CheckCircle } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

interface AnalyticsData {
  totalSurveys: number
  completionRate: number
  approvalRate: number
  avgProcessingTime: number
  growth: number
  monthlyTrend: Array<{ month: string; surveys: number; approved: number }>
  provinceStats: Array<{ name: string; total: number; approved: number }>
  objectTypes: Array<{ type: string; count: number }>
  statusDistribution: Array<{ status: string; count: number }>
  landUseTypes: Array<{ type: string; count: number }>
  performanceMetrics: Array<{ metric: string; score: number }>
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  reviewed: '#0ea5e9',
  approved_commune: '#8b5cf6',
  approved_central: '#3b82f6',
  published: '#10b981',
  rejected: '#ef4444',
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    totalSurveys: 0,
    completionRate: 0,
    approvalRate: 0,
    avgProcessingTime: 0,
    growth: 0,
    monthlyTrend: [],
    provinceStats: [],
    objectTypes: [],
    statusDistribution: [],
    landUseTypes: [],
    performanceMetrics: [],
  })
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const { data: surveys, error } = await supabase
          .from('survey_locations')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

        // Calculate metrics
        const total = surveys?.length || 0
        const completed = surveys?.filter(s => s.status === 'published').length || 0
        const approved = surveys?.filter(s =>
          s.status === 'approved_central' || s.status === 'published'
        ).length || 0

        const thisMonthCount = surveys?.filter(s =>
          new Date(s.created_at) >= thisMonth
        ).length || 0

        const lastMonthCount = surveys?.filter(s => {
          const date = new Date(s.created_at)
          return date >= lastMonth && date < thisMonth
        }).length || 0

        const growth = lastMonthCount > 0
          ? ((thisMonthCount - lastMonthCount) / lastMonthCount * 100)
          : thisMonthCount > 0 ? 100 : 0

        // Calculate average processing time (in hours)
        const processedSurveys = surveys?.filter(s =>
          s.status === 'published' && s.updated_at && s.created_at
        ) || []

        const avgTime = processedSurveys.length > 0
          ? processedSurveys.reduce((sum, s) => {
            const created = new Date(s.created_at).getTime()
            const updated = new Date(s.updated_at!).getTime()
            return sum + (updated - created) / (1000 * 60 * 60) // Convert to hours
          }, 0) / processedSurveys.length
          : 0

        // Monthly trend (last 6 months)
        const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)

          const monthSurveys = surveys?.filter(s => {
            const date = new Date(s.created_at)
            return date >= monthStart && date < monthEnd
          }) || []

          return {
            month: monthStart.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }),
            surveys: monthSurveys.length,
            approved: monthSurveys.filter(s =>
              s.status === 'approved_central' || s.status === 'published'
            ).length,
          }
        })

        // Province statistics (top 10)
        const provinceMap = new Map<string, { total: number; approved: number }>()
        surveys?.forEach(survey => {
          const provinceCode = survey.province_code?.substring(0, 2) || 'Unknown'
          const existing = provinceMap.get(provinceCode) || { total: 0, approved: 0 }
          existing.total++
          if (survey.status === 'approved_central' || survey.status === 'published') {
            existing.approved++
          }
          provinceMap.set(provinceCode, existing)
        })

        const provinceStats = Array.from(provinceMap.entries())
          .map(([code, stats]) => ({
            name: getProvinceName(code),
            total: stats.total,
            approved: stats.approved,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)

        // Object types distribution
        const objectTypeMap = new Map<string, number>()
        surveys?.forEach(s => {
          const type = s.object_type || 'Chưa phân loại'
          objectTypeMap.set(type, (objectTypeMap.get(type) || 0) + 1)
        })

        const objectTypes = Array.from(objectTypeMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Status distribution
        const statusMap = new Map<string, number>()
        surveys?.forEach(s => {
          statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1)
        })

        const statusDistribution = Array.from(statusMap.entries())
          .map(([status, count]) => ({ status: getStatusName(status), count }))

        // Land use types
        const landUseMap = new Map<string, number>()
        surveys?.forEach(s => {
          const type = s.land_use_type || 'Chưa xác định'
          landUseMap.set(type, (landUseMap.get(type) || 0) + 1)
        })

        const landUseTypes = Array.from(landUseMap.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)

        // Performance metrics
        const performanceMetrics = [
          { metric: 'Hiệu quả', score: Math.round((completed / total) * 100) || 0 },
          { metric: 'Chất lượng', score: Math.round((approved / total) * 100) || 0 },
          { metric: 'Tốc độ', score: Math.round(100 - Math.min(avgTime / 2, 100)) || 0 },
          { metric: 'Độ chính xác', score: Math.round((1 - ((surveys?.filter(s => s.status === 'rejected').length || 0) / total)) * 100) || 0 },
          { metric: 'Phản hồi', score: Math.round((thisMonthCount / (lastMonthCount || 1)) * 50) || 0 },
        ]

        setData({
          totalSurveys: total,
          completionRate: total > 0 ? (completed / total) * 100 : 0,
          approvalRate: total > 0 ? (approved / total) * 100 : 0,
          avgProcessingTime: avgTime,
          growth,
          monthlyTrend,
          provinceStats,
          objectTypes,
          statusDistribution,
          landUseTypes,
          performanceMetrics,
        })
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [supabase])

  function getProvinceName(code: string): string {
    const provinces: { [key: string]: string } = {
      '01': 'Hà Nội',
      '79': 'TP HCM',
      '48': 'Đà Nẵng',
      '31': 'Hải Phòng',
      '92': 'Cần Thơ',
      '26': 'Vĩnh Phúc',
      '27': 'Bắc Ninh',
    }
    return provinces[code] || `Tỉnh ${code}`
  }

  function getStatusName(status: string): string {
    const statusNames: { [key: string]: string } = {
      pending: 'Chờ xử lý',
      reviewed: 'Đã xem xét',
      approved_commune: 'Duyệt xã',
      approved_central: 'Duyệt TW',
      published: 'Đã công bố',
      rejected: 'Từ chối',
    }
    return statusNames[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Đang tải phân tích...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 -m-6 p-8 rounded-lg text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-8 w-8" />
          <h1 className="text-4xl font-bold">Phân tích & Báo cáo</h1>
        </div>
        <p className="text-purple-100 text-lg">
          Thống kê chi tiết và phân tích dữ liệu toàn hệ thống
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Tỷ lệ hoàn thành</p>
                <p className="text-4xl font-bold mt-2">{data.completionRate.toFixed(1)}%</p>
                <p className="text-blue-100 text-xs mt-1">Đã công bố</p>
              </div>
              <TrendingUp className="h-12 w-12 text-blue-100 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Thời gian xử lý TB</p>
                <p className="text-4xl font-bold mt-2">{data.avgProcessingTime.toFixed(0)}h</p>
                <p className="text-purple-100 text-xs mt-1">Trung bình</p>
              </div>
              <Clock className="h-12 w-12 text-purple-100 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Tỷ lệ phê duyệt</p>
                <p className="text-4xl font-bold mt-2">{data.approvalRate.toFixed(1)}%</p>
                <p className="text-green-100 text-xs mt-1">Được chấp nhận</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-100 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Tăng trưởng</p>
                <p className="text-4xl font-bold mt-2">{data.growth > 0 ? '+' : ''}{data.growth.toFixed(0)}%</p>
                <p className="text-orange-100 text-xs mt-1">So với tháng trước</p>
              </div>
              <Activity className="h-12 w-12 text-orange-100 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Xu hướng 6 tháng
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={data.monthlyTrend}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="surveys" stroke="#3b82f6" fill="url(#colorTotal)" name="Tổng số" />
                <Area type="monotone" dataKey="approved" stroke="#10b981" fill="url(#colorApproved)" name="Đã duyệt" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-purple-600" />
              Phân bố trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Province and Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Top 10 Tỉnh thành
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.provinceStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}
                />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Tổng số" radius={[0, 8, 8, 0]} />
                <Bar dataKey="approved" fill="#10b981" name="Đã duyệt" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Hiệu suất hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={data.performanceMetrics}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" stroke="#6b7280" />
                <PolarRadiusAxis stroke="#6b7280" />
                <Radar name="Điểm số" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
            <CardTitle>Loại đối tượng</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.objectTypes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}
                />
                <Bar dataKey="count" fill="#f59e0b" name="Số lượng" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50">
            <CardTitle>Loại sử dụng đất</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.landUseTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.landUseTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
