'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MapPin, CheckCircle, Clock, FileText, Users, TrendingUp, TrendingDown,
  Activity, BarChart3, Globe, Zap, Target, Award, ArrowUpRight, ArrowDownRight,
  Sparkles, Building2, MapPinned
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function CentralDashboardPage() {
  const [stats, setStats] = useState({
    totalSurveys: 0, pendingApprovals: 0, assignedIds: 0, activeUsers: 0,
    approved_central: 0, rejected: 0, thisMonth: 0, lastMonth: 0
  })
  const [provinceData, setProvinceData] = useState<{ name: string; surveys: number; approved: number }[]>([])
  const [monthlyData, setMonthlyData] = useState<{ month: string; surveys: number; approved: number }[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [statusDistribution, setStatusDistribution] = useState<{ name: string; value: number; color: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      const { data: surveys } = await supabase
        .from('survey_locations')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: users } = await supabase.from('web_users').select('id').eq('is_active', true)
      const { data: locationIds } = await supabase.from('location_identifiers').select('id').eq('is_active', true)

      if (!surveys) return

      const now = new Date()
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      const counts = surveys.reduce((acc, item) => {
        const createdAt = new Date(item.created_at)
        acc.totalSurveys++
        if (item.status === 'approved_commune' || item.status === 'approved_province') acc.pendingApprovals++
        else if (item.status === 'approved_central') acc.approved_central++
        else if (item.status === 'rejected') acc.rejected++
        if (createdAt >= firstDayThisMonth) acc.thisMonth++
        else if (createdAt >= firstDayLastMonth && createdAt < firstDayThisMonth) acc.lastMonth++
        return acc
      }, { totalSurveys: 0, pendingApprovals: 0, approved_central: 0, rejected: 0, thisMonth: 0, lastMonth: 0 })

      setStats({
        ...counts,
        pendingApprovals: counts.pendingApprovals,
        assignedIds: locationIds?.length || 0,
        activeUsers: users?.length || 0,
      })

      // Status distribution for pie chart
      setStatusDistribution([
        { name: 'Đã công bố', value: counts.approved_central, color: '#10b981' },
        { name: 'Chờ duyệt', value: counts.pendingApprovals, color: '#f59e0b' },
        { name: 'Từ chối', value: counts.rejected, color: '#ef4444' },
        { name: 'Khác', value: counts.totalSurveys - counts.approved_central - counts.pendingApprovals - counts.rejected, color: '#6b7280' },
      ])

      // Monthly trends
      const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
        const monthSurveys = surveys.filter(s => {
          const sDate = new Date(s.created_at)
          return sDate >= date && sDate < nextMonth
        })
        return {
          month: date.toLocaleDateString('vi-VN', { month: 'short' }),
          surveys: monthSurveys.length,
          approved: monthSurveys.filter(s => s.status === 'approved_central').length
        }
      })
      setMonthlyData(monthlyTrends)

      // Province stats
      const provinceMap = new Map<string, { total: number; approved: number }>()
      surveys.forEach(survey => {
        const code = survey.province_code?.substring(0, 2) || 'Unknown'
        const existing = provinceMap.get(code) || { total: 0, approved: 0 }
        existing.total++
        if (survey.status === 'approved_central') existing.approved++
        provinceMap.set(code, existing)
      })

      const provinces: { [key: string]: string } = { '01': 'Hà Nội', '79': 'TP HCM', '48': 'Đà Nẵng', '31': 'Hải Phòng', '92': 'Cần Thơ' }
      const provinceStats = Array.from(provinceMap.entries())
        .map(([code, data]) => ({ name: provinces[code] || `Tỉnh ${code}`, surveys: data.total, approved: data.approved }))
        .sort((a, b) => b.surveys - a.surveys)
        .slice(0, 5)
      setProvinceData(provinceStats)

      setRecentActivity(surveys.slice(0, 8))
    }

    fetchStats()
  }, [])

  const monthlyGrowth = stats.lastMonth > 0
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1)
    : stats.thisMonth > 0 ? '100' : '0'
  const isGrowing = parseFloat(monthlyGrowth) >= 0
  const completionRate = stats.totalSurveys > 0 ? ((stats.approved_central / stats.totalSurveys) * 100).toFixed(1) : '0'

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      'approved_central': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Đã công bố' },
      'approved_commune': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Chờ duyệt Tỉnh' },
      'approved_province': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Chờ duyệt TW' },
      'rejected': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Từ chối' },
      'pending': { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Chờ xử lý' },
    }
    return configs[status] || configs['pending']
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -m-6 p-6">
      {/* Hero Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Globe className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Dashboard Trung ương</h1>
                  <p className="text-white/70">Hệ thống Định danh Vị trí Quốc gia</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-white/70">Tăng trưởng tháng</div>
                <div className="flex items-center gap-2">
                  {isGrowing ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-400" />
                  )}
                  <span className={`text-2xl font-bold ${isGrowing ? 'text-emerald-400' : 'text-red-400'}`}>
                    {monthlyGrowth}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats in Hero */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3">
              <div className="text-2xl font-bold text-white">{stats.thisMonth}</div>
              <div className="text-sm text-white/70">Tháng này</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3">
              <div className="text-2xl font-bold text-white">{stats.lastMonth}</div>
              <div className="text-sm text-white/70">Tháng trước</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3">
              <div className="text-2xl font-bold text-emerald-400">{completionRate}%</div>
              <div className="text-sm text-white/70">Hoàn thành</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3">
              <div className="text-2xl font-bold text-amber-400">{stats.pendingApprovals}</div>
              <div className="text-sm text-white/70">Chờ duyệt</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 transition-all hover:bg-slate-800/70 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition-all group-hover:bg-blue-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <Sparkles className="h-5 w-5 text-blue-400/50" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.totalSurveys.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Tổng khảo sát</div>
            <div className="mt-3 text-xs text-blue-400 font-medium">Trên toàn quốc</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 transition-all hover:bg-slate-800/70 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              {stats.pendingApprovals > 0 && (
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.pendingApprovals.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Chờ phê duyệt</div>
            <div className="mt-3 text-xs text-amber-400 font-medium">Cần xử lý ngay</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 transition-all hover:bg-slate-800/70 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-all group-hover:bg-emerald-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <Award className="h-5 w-5 text-emerald-400/50" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.approved_central.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Đã công bố</div>
            <div className="mt-3 text-xs text-emerald-400 font-medium">Hoàn tất xử lý</div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 transition-all hover:bg-slate-800/70 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl transition-all group-hover:bg-purple-500/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <Zap className="h-5 w-5 text-purple-400/50" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.activeUsers.toLocaleString()}</div>
            <div className="text-sm text-slate-400">Người dùng</div>
            <div className="mt-3 text-xs text-purple-400 font-medium">Đang hoạt động</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Trend Chart - Takes 2 columns */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Xu hướng 6 tháng</h3>
                <p className="text-sm text-slate-400">Khảo sát và phê duyệt</p>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorSurveys2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorApproved2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                labelStyle={{ color: '#f1f5f9' }}
                itemStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="surveys" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSurveys2)" name="Khảo sát" />
              <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved2)" name="Đã duyệt" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution Pie */}
        <div className="rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/20">
              <Target className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Phân bố trạng thái</h3>
              <p className="text-sm text-slate-400">Tổng quan khảo sát</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#f1f5f9' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {statusDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Province Stats */}
        <div className="rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
              <MapPinned className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Top Tỉnh thành</h3>
              <p className="text-sm text-slate-400">Theo số lượng khảo sát</p>
            </div>
          </div>
          <div className="space-y-4">
            {provinceData.map((province, idx) => (
              <div key={province.name} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-200">{province.name}</span>
                  </div>
                  <span className="text-sm text-slate-400">{province.surveys}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${provinceData[0]?.surveys ? (province.surveys / provinceData[0].surveys) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
                <Activity className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Hoạt động gần đây</h3>
                <p className="text-sm text-slate-400">Các khảo sát mới nhất</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Chưa có hoạt động nào</p>
              </div>
            ) : (
              recentActivity.map((activity, idx) => {
                const statusConfig = getStatusConfig(activity.status)
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-slate-700/30 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600 transition-all cursor-pointer"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700">
                      <Building2 className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {activity.location_name || 'Chưa đặt tên'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{activity.address || 'Chưa có địa chỉ'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(activity.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 p-4 text-center hover:from-indigo-600/30 hover:to-purple-600/30 transition-all cursor-pointer">
          <MapPin className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
          <span className="text-sm font-medium text-slate-200">Mã định danh</span>
          <p className="text-2xl font-bold text-white mt-1">{stats.assignedIds.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-4 text-center hover:from-emerald-600/30 hover:to-teal-600/30 transition-all cursor-pointer">
          <Target className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
          <span className="text-sm font-medium text-slate-200">Tỷ lệ duyệt</span>
          <p className="text-2xl font-bold text-white mt-1">{completionRate}%</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-red-600/20 to-pink-600/20 border border-red-500/30 p-4 text-center hover:from-red-600/30 hover:to-pink-600/30 transition-all cursor-pointer">
          <TrendingDown className="h-6 w-6 text-red-400 mx-auto mb-2" />
          <span className="text-sm font-medium text-slate-200">Từ chối</span>
          <p className="text-2xl font-bold text-white mt-1">{stats.rejected.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 p-4 text-center hover:from-amber-600/30 hover:to-orange-600/30 transition-all cursor-pointer">
          <Zap className="h-6 w-6 text-amber-400 mx-auto mb-2" />
          <span className="text-sm font-medium text-slate-200">Tháng này</span>
          <p className="text-2xl font-bold text-white mt-1">{stats.thisMonth}</p>
        </div>
      </div>
    </div>
  )
}
