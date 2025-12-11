'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import {
  MapPin, Building2, Users, TrendingUp, Globe,
  CheckCircle, Clock, BarChart3, Search, FileText,
  ChevronRight, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface NationalStats {
  total: number
  pending: number
  approved: number
  approved_province: number
  thisMonth: number
  lastMonth: number
  provinces: { name: string; count: number }[]
  dailyTrend: { date: string; count: number }[]
  byType: { type: string; count: number }[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// Vietnamese display labels for object types (localization helper, not mock data)
function getObjectTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'residential': 'Nhà ở',
    'commercial': 'Thương mại',
    'industrial': 'Công nghiệp',
    'agricultural': 'Nông nghiệp',
    'mixed': 'Hỗn hợp',
    'other': 'Khác'
  }
  // Return Vietnamese label if exists, otherwise return the raw type from database
  return labels[type] || type
}

export default function PublicPortalPage() {
  const [stats, setStats] = useState<NationalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from('survey_locations')
          .select('*')

        if (error) throw error

        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

        // Calculate stats
        const nationalStats: NationalStats = {
          total: data?.length || 0,
          pending: data?.filter(s => s.status === 'pending').length || 0,
          approved: data?.filter(s => ['approved_commune', 'approved_central', 'approved_province'].includes(s.status)).length || 0,
          approved_province: data?.filter(s => s.status === 'approved_province').length || 0,
          thisMonth: data?.filter(s => new Date(s.created_at) >= thisMonthStart).length || 0,
          lastMonth: data?.filter(s => {
            const d = new Date(s.created_at)
            return d >= lastMonthStart && d <= lastMonthEnd
          }).length || 0,
          provinces: [],
          dailyTrend: [],
          byType: []
        }

        // Group by province - using real province codes from database
        const provinceMap = new Map<string, number>()
        data?.forEach(s => {
          const province = s.province_code || null
          if (province) {
            provinceMap.set(province, (provinceMap.get(province) || 0) + 1)
          }
        })
        nationalStats.provinces = Array.from(provinceMap.entries())
          .map(([code, count]) => ({ name: `Mã tỉnh: ${code}`, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Daily trend (last 14 days)
        const last14Days = Array.from({ length: 14 }, (_, i) => {
          const date = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000)
          return {
            date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            count: data?.filter(s => {
              const d = new Date(s.created_at)
              return d.toDateString() === date.toDateString()
            }).length || 0
          }
        })
        nationalStats.dailyTrend = last14Days

        // By type - using real object_type values from database
        const typeMap = new Map<string, number>()
        data?.forEach(s => {
          const type = s.object_type || 'other'
          typeMap.set(type, (typeMap.get(type) || 0) + 1)
        })
        nationalStats.byType = Array.from(typeMap.entries())
          .map(([type, count]) => ({ type: getObjectTypeLabel(type), count }))

        setStats(nationalStats)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-4" />
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  const growthRate = stats?.lastMonth
    ? (((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur">
              <Globe className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                Hệ thống Định danh Địa điểm Quốc gia
              </h1>
              <p className="text-blue-200 mt-1">C06 - Bộ Công an Việt Nam</p>
            </div>
          </div>

          <p className="text-blue-100 max-w-2xl mb-8">
            Cổng thông tin công khai về tiến độ khảo sát và định danh các địa điểm trên toàn quốc.
            Dữ liệu được cập nhật theo thời gian thực.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo địa chỉ hoặc mã định danh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-gray-900 placeholder-gray-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Tìm kiếm
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <MapPin className="h-8 w-8 mb-3 text-blue-300" />
              <div className="text-4xl font-bold">{stats?.total.toLocaleString()}</div>
              <div className="text-blue-200 text-sm">Tổng địa điểm</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <CheckCircle className="h-8 w-8 mb-3 text-green-300" />
              <div className="text-4xl font-bold">{stats?.approved_province.toLocaleString()}</div>
              <div className="text-blue-200 text-sm">Đã duyệt (Tỉnh)</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <Clock className="h-8 w-8 mb-3 text-yellow-300" />
              <div className="text-4xl font-bold">{stats?.pending.toLocaleString()}</div>
              <div className="text-blue-200 text-sm">Đang xử lý</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <TrendingUp className="h-8 w-8 mb-3 text-emerald-300" />
              <div className="text-4xl font-bold">+{growthRate}%</div>
              <div className="text-blue-200 text-sm">Tăng trưởng tháng</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Trend */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Xu hướng 14 ngày qua
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats?.dailyTrend}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    name="Số khảo sát"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* By Type */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Phân loại theo loại hình
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats?.byType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="type"
                  >
                    {stats?.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Provinces */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Top 10 Tỉnh/Thành phố
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats?.provinces} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="name" type="category" stroke="#6b7280" width={120} fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#3b82f6" name="Số khảo sát" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <FileText className="h-10 w-10 text-blue-600 mb-4" />
                  <h3 className="font-semibold text-lg">Tra cứu địa điểm</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Tìm kiếm thông tin địa điểm đã được định danh
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <ExternalLink className="h-10 w-10 text-green-600 mb-4" />
                  <h3 className="font-semibold text-lg">API công khai</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Tích hợp dữ liệu vào hệ thống của bạn
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Users className="h-10 w-10 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg">Xác minh sở hữu</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Xác nhận thông tin tài sản của bạn
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm border-t pt-8">
          <p>© 2025 Bộ Công an Việt Nam - Cục C06</p>
          <p className="mt-1">Hệ thống Định danh Địa điểm Quốc gia</p>
        </div>
      </div>
    </div>
  )
}
