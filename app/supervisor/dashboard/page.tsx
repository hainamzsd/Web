'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Stats {
  pending: number
  reviewed: number
  approved: number
  rejected: number
  total: number
  thisWeek: number
  lastWeek: number
}

export default function SupervisorDashboardPage() {
  const { webUser, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    reviewed: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    thisWeek: 0,
    lastWeek: 0
  })
  const [recentSurveys, setRecentSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (authLoading) return

    async function fetchData() {
      if (!webUser) {
        setLoading(false)
        return
      }

      try {
        // Build query based on available filters
        let query = supabase
          .from('survey_locations')
          .select('*')
          .order('created_at', { ascending: false })

        // Filter by ward_id first, then province_id, then province_code
        if (webUser.ward_id) {
          query = query.eq('ward_id', webUser.ward_id)
        } else if (webUser.province_id) {
          query = query.eq('province_id', webUser.province_id)
        } else if (webUser.province_code) {
          query = query.eq('province_code', webUser.province_code)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching surveys:', error)
          return
        }

        if (!data) return

        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        const counts = data.reduce((acc, item) => {
          const createdAt = new Date(item.created_at)
          acc.total++

          if (item.status === 'pending') acc.pending++
          else if (item.status === 'reviewed') acc.reviewed++
          else if (item.status === 'approved_commune') acc.approved++
          else if (item.status === 'rejected') acc.rejected++

          if (createdAt >= oneWeekAgo) acc.thisWeek++
          else if (createdAt >= twoWeeksAgo) acc.lastWeek++

          return acc
        }, { pending: 0, reviewed: 0, approved: 0, rejected: 0, total: 0, thisWeek: 0, lastWeek: 0 })

        setStats(counts)
        setRecentSurveys(data.slice(0, 5))
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [webUser, authLoading])

  const weeklyChange = stats.lastWeek > 0
    ? ((stats.thisWeek - stats.lastWeek) / stats.lastWeek * 100)
    : stats.thisWeek > 0 ? 100 : 0

  const approvalRate = stats.total > 0
    ? ((stats.approved / stats.total) * 100).toFixed(0)
    : '0'

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const needsReview = stats.pending + stats.reviewed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tổng quan hoạt động xem xét và phê duyệt khảo sát
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cần xem xét</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{needsReview}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.pending} mới, {stats.reviewed} đã xem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Đã phê duyệt</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-gray-500 mt-1">
              Tỷ lệ duyệt: {approvalRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Từ chối</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-gray-500 mt-1">
              Cần xem lại
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tổng khảo sát</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex items-center text-xs mt-1">
              {weeklyChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(weeklyChange).toFixed(0)}%
              </span>
              <span className="text-gray-500 ml-1">so với tuần trước</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Surveys */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Khảo sát gần đây</CardTitle>
                <CardDescription>5 khảo sát mới nhất trong khu vực</CardDescription>
              </div>
              <Link href="/supervisor/reviews">
                <Button variant="ghost" size="sm">
                  Xem tất cả
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentSurveys.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Chưa có khảo sát nào
              </p>
            ) : (
              <div className="space-y-3">
                {recentSurveys.map((survey) => (
                  <Link
                    key={survey.id}
                    href={`/supervisor/reviews/${survey.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {survey.location_name || 'Chưa đặt tên'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {survey.address || 'Chưa có địa chỉ'}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${survey.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                        ${survey.status === 'reviewed' ? 'bg-blue-100 text-blue-700' : ''}
                        ${survey.status === 'approved_commune' ? 'bg-green-100 text-green-700' : ''}
                        ${survey.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        {survey.status === 'pending' && 'Chờ xử lý'}
                        {survey.status === 'reviewed' && 'Đã xem xét'}
                        {survey.status === 'approved_commune' && 'Đã duyệt'}
                        {survey.status === 'rejected' && 'Từ chối'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thống kê nhanh</CardTitle>
            <CardDescription>Tình hình xử lý trong tuần</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Khảo sát tuần này</span>
                <span className="text-sm font-semibold">{stats.thisWeek}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.thisWeek / Math.max(stats.total, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tỷ lệ phê duyệt</span>
                <span className="text-sm font-semibold">{approvalRate}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tỷ lệ từ chối</span>
                <span className="text-sm font-semibold">
                  {stats.total > 0 ? ((stats.rejected / stats.total) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
                  <p className="text-xs text-gray-500">Tuần này</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{stats.lastWeek}</p>
                  <p className="text-xs text-gray-500">Tuần trước</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
