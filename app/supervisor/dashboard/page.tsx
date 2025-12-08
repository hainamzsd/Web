'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Clock, FileText, TrendingUp, TrendingDown, Shield } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444']

export default function SupervisorDashboardPage() {
  const [stats, setStats] = useState({ pendingReviews: 0, approved: 0, total: 0, rejected: 0, thisWeek: 0, lastWeek: 0 })
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: webUser } = await supabase
        .from('web_users')
        .select('province_code, province_id')
        .eq('profile_id', user.id)
        .single()

      if (!webUser) return

      // Build query - filter by province_id if available, otherwise by province_code
      let query = supabase
        .from('survey_locations')
        .select('*')
        .order('created_at', { ascending: false })

      if (webUser.province_id) {
        query = query.eq('province_id', webUser.province_id)
      } else if (webUser.province_code) {
        query = query.eq('province_code', webUser.province_code)
      } else {
        return
      }

      const { data } = await query

      if (!data) return

      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const counts = data.reduce((acc, item) => {
        const createdAt = new Date(item.created_at)
        acc.total++
        if (item.status === 'reviewed') acc.pendingReviews++
        else if (item.status === 'approved_commune') acc.approved++
        else if (item.status === 'rejected') acc.rejected++
        if (createdAt >= oneWeekAgo) acc.thisWeek++
        else if (createdAt >= twoWeeksAgo) acc.lastWeek++
        return acc
      }, { pendingReviews: 0, approved: 0, total: 0, rejected: 0, thisWeek: 0, lastWeek: 0 })

      setStats(counts)
      setStatusData([
        { name: 'Chờ duyệt', value: counts.pendingReviews },
        { name: 'Đã duyệt', value: counts.approved },
        { name: 'Đã xử lý', value: counts.total - counts.pendingReviews - counts.approved - counts.rejected },
        { name: 'Từ chối', value: counts.rejected },
      ])
    }

    fetchStats()
  }, [])

  const weeklyGrowth = stats.lastWeek > 0
    ? ((stats.thisWeek - stats.lastWeek) / stats.lastWeek * 100).toFixed(1)
    : stats.thisWeek > 0 ? '100' : '0'
  const isGrowing = parseFloat(weeklyGrowth) >= 0

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 -m-6 mb-6 p-6 rounded-lg text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Dashboard Giám sát</h1>
        </div>
        <p className="text-green-100 mt-1">Tổng quan các khảo sát cần xem xét và phê duyệt</p>
        <div className="flex items-center gap-4 mt-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="text-sm text-green-100">Tuần này</div>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
          </div>
          <div className="flex items-center gap-1">
            {isGrowing ? <TrendingUp className="h-5 w-5 text-green-300" /> : <TrendingDown className="h-5 w-5 text-red-300" />}
            <span className={`text-lg font-semibold ${isGrowing ? 'text-green-300' : 'text-red-300'}`}>{weeklyGrowth}%</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Chờ xem xét</p>
              <p className="text-4xl font-bold mt-2">{stats.pendingReviews}</p>
              <p className="text-orange-100 text-xs mt-1">Cần phê duyệt ngay</p>
            </div>
            <Clock className="h-14 w-14 text-orange-100 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Đã phê duyệt</p>
              <p className="text-4xl font-bold mt-2">{stats.approved}</p>
              <p className="text-green-100 text-xs mt-1">Hoàn tất trong tháng</p>
            </div>
            <CheckCircle className="h-14 w-14 text-green-100 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Tổng số</p>
              <p className="text-4xl font-bold mt-2">{stats.total}</p>
              <p className="text-blue-100 text-xs mt-1">Khảo sát trong tỉnh</p>
            </div>
            <FileText className="h-14 w-14 text-blue-100 opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle>Phân bố trạng thái</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} dataKey="value">
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle>Hiệu suất xử lý</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-xl">
                <div className="text-sm text-blue-700 font-medium">Tỷ lệ phê duyệt</div>
                <div className="text-4xl font-bold text-blue-900 mt-2">
                  {stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : 0}%
                </div>
                <div className="text-xs text-blue-600 mt-1">{stats.approved}/{stats.total} khảo sát</div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-100 p-5 rounded-xl">
                <div className="text-sm text-amber-700 font-medium">Đang chờ</div>
                <div className="text-4xl font-bold text-amber-900 mt-2">{stats.pendingReviews}</div>
                <div className="text-xs text-amber-600 mt-1">Cần xem xét</div>
              </div>

              <div className="bg-gradient-to-r from-red-50 to-rose-100 p-5 rounded-xl">
                <div className="text-sm text-red-700 font-medium">Từ chối</div>
                <div className="text-4xl font-bold text-red-900 mt-2">{stats.rejected}</div>
                <div className="text-xs text-red-600 mt-1">Cần xem lại</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
