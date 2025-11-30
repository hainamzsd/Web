'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown, Activity, MapPin, Zap } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { QualityScore, calculateQualityScore } from '@/components/ui/quality-score'
import { OfficerLeaderboard } from '@/components/leaderboard/officer-leaderboard'
import Link from 'next/link'
import { Database } from '@/lib/types/database'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  pending: number
  reviewed: number
  approved: number
  rejected: number
  total: number
  thisWeek: number
  lastWeek: number
}

interface ChartData {
  name: string
  surveys: number
}

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444']

export default function CommuneDashboardPage() {
  const { webUser } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    reviewed: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    thisWeek: 0,
    lastWeek: 0,
  })
  const [recentSurveys, setRecentSurveys] = useState<SurveyLocation[]>([])
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([])
  const [statusData, setStatusData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      if (!webUser) return

      try {
        const { data, error } = await supabase
          .from('survey_locations')
          .select('*')
          .eq('ward_code', webUser.commune_code)
          .order('created_at', { ascending: false })

        if (error) throw error

        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        const statsCounts = (data || []).reduce((acc, item) => {
          const createdAt = new Date(item.created_at)

          if (item.status === 'pending') acc.pending++
          else if (item.status === 'reviewed') acc.reviewed++
          else if (item.status === 'approved_commune' || item.status === 'approved_central' || item.status === 'published') acc.approved++
          else if (item.status === 'rejected') acc.rejected++

          acc.total++
          if (createdAt >= oneWeekAgo) acc.thisWeek++
          else if (createdAt >= twoWeeksAgo) acc.lastWeek++

          return acc
        }, { pending: 0, reviewed: 0, approved: 0, rejected: 0, total: 0, thisWeek: 0, lastWeek: 0 })

        setStats(statsCounts)
        setRecentSurveys(data?.slice(0, 5) || [])

        // Prepare status distribution data for pie chart
        setStatusData([
          { name: 'Chờ xử lý', surveys: statsCounts.pending },
          { name: 'Đã xem xét', surveys: statsCounts.reviewed },
          { name: 'Đã phê duyệt', surveys: statsCounts.approved },
          { name: 'Từ chối', surveys: statsCounts.rejected },
        ])

        // Prepare weekly trend data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
          return {
            name: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
            surveys: (data || []).filter(item => {
              const itemDate = new Date(item.created_at)
              return itemDate.toDateString() === date.toDateString()
            }).length
          }
        })
        setWeeklyData(last7Days)

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [webUser]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const weeklyGrowth = stats.lastWeek > 0
    ? ((stats.thisWeek - stats.lastWeek) / stats.lastWeek * 100).toFixed(1)
    : stats.thisWeek > 0 ? '100' : '0'
  const isGrowing = parseFloat(weeklyGrowth) >= 0

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 -m-6 mb-6 p-6 rounded-lg text-white">
        <h1 className="text-3xl font-bold">Dashboard Xã</h1>
        <p className="text-blue-100 mt-1">
          Tổng quan về các khảo sát trong xã của bạn
        </p>
        <div className="flex items-center gap-4 mt-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="text-sm text-blue-100">Tuần này</div>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
          </div>
          <div className="flex items-center gap-1">
            {isGrowing ? (
              <TrendingUp className="h-5 w-5 text-green-300" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-300" />
            )}
            <span className={`text-lg font-semibold ${isGrowing ? 'text-green-300' : 'text-red-300'}`}>
              {weeklyGrowth}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards with enhanced styling */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Chờ xử lý</p>
              <p className="text-3xl font-bold mt-2">{stats.pending}</p>
              <p className="text-yellow-100 text-xs mt-1">Cần xem xét ngay</p>
            </div>
            <Clock className="h-12 w-12 text-yellow-100 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Đã xem xét</p>
              <p className="text-3xl font-bold mt-2">{stats.reviewed}</p>
              <p className="text-blue-100 text-xs mt-1">Chờ phê duyệt cấp trên</p>
            </div>
            <FileText className="h-12 w-12 text-blue-100 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Đã phê duyệt</p>
              <p className="text-3xl font-bold mt-2">{stats.approved}</p>
              <p className="text-green-100 text-xs mt-1">Hoàn tất quy trình</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-100 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Từ chối</p>
              <p className="text-3xl font-bold mt-2">{stats.rejected}</p>
              <p className="text-red-100 text-xs mt-1">Cần xem lại thông tin</p>
            </div>
            <XCircle className="h-12 w-12 text-red-100 opacity-80" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Xu hướng 7 ngày qua
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="surveys"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Số khảo sát"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Phân bố theo trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="surveys"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Surveys and Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle>Khảo sát gần đây</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {recentSurveys.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Chưa có khảo sát nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSurveys.map((survey) => (
                  <Link
                    key={survey.id}
                    href={`/commune/surveys/${survey.id}`}
                    className="block p-4 rounded-lg border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate group-hover:text-blue-600 transition-colors">
                          {survey.location_name || 'Chưa đặt tên'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {survey.address || 'Chưa có địa chỉ'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(survey.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:block">
                          <QualityScore score={calculateQualityScore(survey).total} size="sm" />
                        </div>
                        <StatusBadge status={survey.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle className="text-lg">Thống kê nhanh</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                <div className="text-sm text-blue-700 font-medium">Tổng khảo sát</div>
                <div className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                <div className="text-sm text-green-700 font-medium">Tỷ lệ hoàn thành</div>
                <div className="text-3xl font-bold text-green-900 mt-1">
                  {stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : 0}%
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                <div className="text-sm text-purple-700 font-medium">Cần xử lý</div>
                <div className="text-3xl font-bold text-purple-900 mt-1">{stats.pending}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Officer Leaderboard */}
      <OfficerLeaderboard scope="commune" communeCode={webUser?.commune_code || undefined} limit={5} />

      {/* AI Quality Notice */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Quality Scoring</h3>
              <p className="text-indigo-100 mt-1">
                Mỗi khảo sát được AI đánh giá tự động dựa trên chất lượng ảnh, độ chính xác GPS,
                và mức độ đầy đủ thông tin. Điểm số cao giúp khảo sát được duyệt nhanh hơn!
              </p>
              <div className="flex gap-4 mt-4">
                <div className="bg-white/20 rounded-lg px-3 py-2">
                  <span className="text-green-300 font-bold">90+</span>
                  <span className="text-indigo-100 text-sm ml-2">Fast Track</span>
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-2">
                  <span className="text-blue-300 font-bold">70-89</span>
                  <span className="text-indigo-100 text-sm ml-2">Normal</span>
                </div>
                <div className="bg-white/20 rounded-lg px-3 py-2">
                  <span className="text-yellow-300 font-bold">&lt;70</span>
                  <span className="text-indigo-100 text-sm ml-2">Cần xem xét</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
