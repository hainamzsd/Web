'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, Clock, XCircle, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { OfficerLeaderboard } from '@/components/leaderboard/officer-leaderboard'
import Link from 'next/link'
import { Database } from '@/lib/types/database'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444']

export default function CommuneDashboardPage() {
  const { webUser, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({ pending: 0, reviewed: 0, approved: 0, rejected: 0, total: 0, thisWeek: 0, lastWeek: 0 })
  const [recentSurveys, setRecentSurveys] = useState<SurveyLocation[]>([])
  const [weeklyData, setWeeklyData] = useState<{ name: string; surveys: number }[]>([])
  const [statusData, setStatusData] = useState<{ name: string; surveys: number }[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      // Wait for auth to finish loading
      if (authLoading) return

      // If no webUser, stop loading
      if (!webUser) {
        setDataLoading(false)
        return
      }

      let query = supabase
        .from('survey_locations')
        .select('*')
        .order('created_at', { ascending: false })

      if (webUser.ward_id) {
        query = query.eq('ward_id', webUser.ward_id)
      } else if (webUser.province_id) {
        query = query.eq('province_id', webUser.province_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching surveys:', error)
        setDataLoading(false)
        return
      }

      if (!data) {
        setDataLoading(false)
        return
      }

      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const counts = data.reduce((acc, item) => {
        const createdAt = new Date(item.created_at)
        if (item.status === 'pending') acc.pending++
        else if (item.status === 'reviewed') acc.reviewed++
        else if (['approved_commune', 'approved_central', 'approved_province'].includes(item.status)) acc.approved++
        else if (item.status === 'rejected') acc.rejected++
        acc.total++
        if (createdAt >= oneWeekAgo) acc.thisWeek++
        else if (createdAt >= twoWeeksAgo) acc.lastWeek++
        return acc
      }, { pending: 0, reviewed: 0, approved: 0, rejected: 0, total: 0, thisWeek: 0, lastWeek: 0 })

      setStats(counts)
      setRecentSurveys(data.slice(0, 5) as any)
      setStatusData([
        { name: 'Chờ xử lý', surveys: counts.pending },
        { name: 'Đã xem xét', surveys: counts.reviewed },
        { name: 'Đã phê duyệt', surveys: counts.approved },
        { name: 'Từ chối', surveys: counts.rejected },
      ])

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
        return {
          name: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
          surveys: data.filter(item => new Date(item.created_at).toDateString() === date.toDateString()).length
        }
      })
      setWeeklyData(last7Days)
      setDataLoading(false)
    }

    fetchData()
  }, [authLoading, webUser])

  const loading = authLoading || dataLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  const weeklyGrowth = stats.lastWeek > 0
    ? ((stats.thisWeek - stats.lastWeek) / stats.lastWeek * 100).toFixed(1)
    : stats.thisWeek > 0 ? '100' : '0'
  const isGrowing = parseFloat(weeklyGrowth) >= 0

  return (
    <div className="space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Tổng quan hoạt động khảo sát và quản lý dữ liệu</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Tuần này:</span>
            <span className="font-semibold text-foreground">{stats.thisWeek}</span>
            <span className={`flex items-center text-xs ${isGrowing ? 'text-green-600' : 'text-red-600'} font-medium`}>
              {isGrowing ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {weeklyGrowth}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ xử lý</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Yêu cầu cần duyệt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã xem xét</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reviewed}</div>
            <p className="text-xs text-muted-foreground">Đang chờ cấp trên</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã phê duyệt</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Hoàn tất quy trình</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Từ chối</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Cần chỉnh sửa lại</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Xu hướng khảo sát</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                <Line type="monotone" dataKey="surveys" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Trạng thái phân bố</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="surveys">
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Khảo sát gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSurveys.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">Chưa có dữ liệu khảo sát</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSurveys.map((survey) => (
                  <Link key={survey.id} href={`/commune/surveys/${survey.id}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col gap-1 min-w-0 pr-4">
                      <span className="font-medium truncate text-sm">{survey.location_name || 'Chưa đặt tên'}</span>
                      <span className="text-xs text-muted-foreground truncate">{survey.address || 'Chưa có địa chỉ'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={survey.status} />
                      <div className="text-xs text-muted-foreground w-20 text-right">
                        {new Date(survey.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Xếp hạng cán bộ</CardTitle>
          </CardHeader>
          <CardContent>
            <OfficerLeaderboard scope="commune" wardId={webUser?.ward_id || undefined} limit={5} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1">
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Quality Scoring System</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Hệ thống tự động đánh giá chất lượng khảo sát. Điểm số cao (&gt;90) sẽ được ưu tiên duyệt nhanh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
