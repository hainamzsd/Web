'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/ui/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, CheckCircle, Clock, FileText, Users, TrendingUp, Activity, BarChart3, Globe } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface NationwideStats {
  totalSurveys: number
  pendingApprovals: number
  assignedIds: number
  activeUsers: number
  pendingCentral: number
  published: number
  rejected: number
  thisMonth: number
  lastMonth: number
}

interface ProvinceData {
  name: string
  surveys: number
  approved: number
}

interface MonthlyData {
  month: string
  surveys: number
  approved: number
}

const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function CentralDashboardPage() {
  const { webUser } = useAuth()
  const [stats, setStats] = useState<NationwideStats>({
    totalSurveys: 0,
    pendingApprovals: 0,
    assignedIds: 0,
    activeUsers: 0,
    pendingCentral: 0,
    published: 0,
    rejected: 0,
    thisMonth: 0,
    lastMonth: 0,
  })
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchStats() {
      if (!webUser) return

      try {
        // Fetch all surveys with full details
        const { data: surveys, error: surveysError } = await supabase
          .from('survey_locations')
          .select('*')
          .order('created_at', { ascending: false })

        if (surveysError) throw surveysError

        // Fetch active web users
        const { data: users, error: usersError } = await supabase
          .from('web_users')
          .select('id')
          .eq('is_active', true)

        if (usersError) throw usersError

        // Fetch assigned location IDs
        const { data: locationIds, error: idsError } = await supabase
          .from('location_identifiers')
          .select('id')
          .eq('is_active', true)

        if (idsError) throw idsError

        const now = new Date()
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

        const statsCounts = surveys?.reduce((acc, item) => {
          const createdAt = new Date(item.created_at)
          acc.totalSurveys++

          if (item.status === 'approved_commune') acc.pendingCentral++
          else if (item.status === 'approved_central' || item.status === 'published') acc.published++
          else if (item.status === 'rejected') acc.rejected++

          if (createdAt >= firstDayThisMonth) acc.thisMonth++
          else if (createdAt >= firstDayLastMonth && createdAt < firstDayThisMonth) acc.lastMonth++

          return acc
        }, {
          totalSurveys: 0,
          pendingCentral: 0,
          published: 0,
          rejected: 0,
          thisMonth: 0,
          lastMonth: 0
        }) || {
          totalSurveys: 0,
          pendingCentral: 0,
          published: 0,
          rejected: 0,
          thisMonth: 0,
          lastMonth: 0
        }

        setStats({
          ...statsCounts,
          pendingApprovals: statsCounts.pendingCentral,
          assignedIds: locationIds?.length || 0,
          activeUsers: users?.length || 0,
        })

        // Prepare monthly trend data (last 6 months)
        const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
          const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
          const nextMonth = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
          const monthSurveys = surveys?.filter(s => {
            const sDate = new Date(s.created_at)
            return sDate >= date && sDate < nextMonth
          }) || []

          return {
            month: date.toLocaleDateString('vi-VN', { month: 'short' }),
            surveys: monthSurveys.length,
            approved: monthSurveys.filter(s => s.status === 'approved_central' || s.status === 'published').length
          }
        })
        setMonthlyData(monthlyTrends)

        // Group by province (using first 2 digits of province_code)
        const provinceMap = new Map<string, { total: number, approved: number }>()
        surveys?.forEach(survey => {
          const provinceCode = survey.province_code?.substring(0, 2) || 'Unknown'
          const existing = provinceMap.get(provinceCode) || { total: 0, approved: 0 }
          existing.total++
          if (survey.status === 'approved_central' || survey.status === 'published') {
            existing.approved++
          }
          provinceMap.set(provinceCode, existing)
        })

        // Convert to array and get top 5 provinces
        const provinceStats = Array.from(provinceMap.entries())
          .map(([code, data]) => ({
            name: getProvinceName(code),
            surveys: data.total,
            approved: data.approved
          }))
          .sort((a, b) => b.surveys - a.surveys)
          .slice(0, 5)

        setProvinceData(provinceStats)

        // Recent activity - last 10 surveys
        setRecentActivity((surveys || []).slice(0, 10))

      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [webUser]) // eslint-disable-line react-hooks/exhaustive-deps

  function getProvinceName(code: string): string {
    const provinces: { [key: string]: string } = {
      '01': 'Hà Nội',
      '79': 'TP HCM',
      '48': 'Đà Nẵng',
      '31': 'Hải Phòng',
      '92': 'Cần Thơ',
    }
    return provinces[code] || `Tỉnh ${code}`
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

  const monthlyGrowth = stats.lastMonth > 0
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
    : stats.thisMonth > 0 ? '100' : '0'
  const isGrowing = parseFloat(monthlyGrowth) >= 0

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 -m-6 mb-6 p-8 rounded-lg text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="h-8 w-8" />
            <h1 className="text-4xl font-bold">Dashboard Trung ương</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Hệ thống định danh vị trí toàn quốc
          </p>
          <div className="flex items-center gap-6 mt-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
              <div className="text-sm text-blue-100">Tháng này</div>
              <div className="text-3xl font-bold">{stats.thisMonth}</div>
            </div>
            <div className="flex items-center gap-2">
              {isGrowing ? (
                <TrendingUp className="h-6 w-6 text-green-300" />
              ) : (
                <TrendingUp className="h-6 w-6 text-red-300 rotate-180" />
              )}
              <span className={`text-2xl font-semibold ${isGrowing ? 'text-green-300' : 'text-red-300'}`}>
                {monthlyGrowth}%
              </span>
              <span className="text-blue-100">so với tháng trước</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Tổng khảo sát</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSurveys.toLocaleString()}</p>
              <p className="text-blue-600 text-xs mt-1 font-medium">Trên toàn quốc</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-yellow-500 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Chờ phê duyệt</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingApprovals.toLocaleString()}</p>
              <p className="text-yellow-600 text-xs mt-1 font-medium">Cần xử lý</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Đã công bố</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.published.toLocaleString()}</p>
              <p className="text-green-600 text-xs mt-1 font-medium">Hoàn tất</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Người dùng</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeUsers.toLocaleString()}</p>
              <p className="text-purple-600 text-xs mt-1 font-medium">Đang hoạt động</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Xu hướng 6 tháng
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorSurveys" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="surveys" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSurveys)" name="Khảo sát" />
                <Area type="monotone" dataKey="approved" stroke="#10b981" fillOpacity={1} fill="url(#colorApproved)" name="Đã duyệt" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Top 5 tỉnh thành
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={provinceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}
                />
                <Legend />
                <Bar dataKey="surveys" fill="#8b5cf6" name="Tổng số" radius={[0, 8, 8, 0]} />
                <Bar dataKey="approved" fill="#10b981" name="Đã duyệt" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity and Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-700" />
              Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Chưa có hoạt động nào</p>
                </div>
              ) : (
                recentActivity.map((activity, idx) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.location_name || 'Chưa đặt tên'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{activity.address || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${activity.status === 'published' ? 'bg-green-100 text-green-700' :
                          activity.status === 'approved_central' ? 'bg-blue-100 text-blue-700' :
                            activity.status === 'approved_commune' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                        }`}>
                        {activity.status}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
            <CardTitle className="text-lg">Thống kê tổng hợp</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-xl text-white shadow-lg">
                <div className="text-sm opacity-90">Mã định danh</div>
                <div className="text-3xl font-bold mt-1">{stats.assignedIds.toLocaleString()}</div>
                <div className="text-xs opacity-75 mt-1">Đã cấp phát</div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 rounded-xl text-white shadow-lg">
                <div className="text-sm opacity-90">Tỷ lệ hoàn thành</div>
                <div className="text-3xl font-bold mt-1">
                  {stats.totalSurveys > 0 ? ((stats.published / stats.totalSurveys) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {stats.published}/{stats.totalSurveys} khảo sát
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-500 to-pink-600 p-5 rounded-xl text-white shadow-lg">
                <div className="text-sm opacity-90">Từ chối</div>
                <div className="text-3xl font-bold mt-1">{stats.rejected.toLocaleString()}</div>
                <div className="text-xs opacity-75 mt-1">Cần xem xét lại</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
