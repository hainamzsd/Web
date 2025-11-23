'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

export const dynamicParams = true
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminSelector } from '@/components/map/admin-selector'
import { Database } from '@/lib/types/database'
import { getProvinceByCode } from '@/lib/map/vietnam-administrative-data'
import { MapPin, BarChart3, TrendingUp } from 'lucide-react'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

// Dynamic import for map to avoid SSR issues
const VietnamAdminMap = dynamic(
  () => import('@/components/map/vietnam-admin-map').then(mod => ({ default: mod.VietnamAdminMap })),
  { ssr: false, loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg" /> }
)

interface ProvinceStat {
  province_code: string
  province_name: string
  total: number
  pending: number
  approved: number
  rejected: number
}

export default function NationalMapPage() {
  const { webUser } = useAuth()
  const [surveys, setSurveys] = useState<SurveyLocation[]>([])
  const [provinceStats, setProvinceStats] = useState<ProvinceStat[]>([])
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('')
  const [selectedCommune, setSelectedCommune] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      if (!webUser) return

      try {
        // Fetch all surveys
        let query = supabase
          .from('survey_locations')
          .select('*')
          .order('created_at', { ascending: false })

        // Apply filters if selected
        if (selectedProvince) {
          query = query.eq('province_code', selectedProvince)
        }
        if (selectedDistrict) {
          query = query.eq('district_code', selectedDistrict)
        }
        if (selectedCommune) {
          query = query.eq('ward_code', selectedCommune)
        }

        const { data, error } = await query

        if (error) throw error
        setSurveys(data || [])

        // Calculate province statistics
        const stats = calculateProvinceStats(data || [])
        setProvinceStats(stats)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [webUser, supabase, selectedProvince, selectedDistrict, selectedCommune])

  const calculateProvinceStats = (surveys: SurveyLocation[]): ProvinceStat[] => {
    const statsByProvince: Record<string, ProvinceStat> = {}

    surveys.forEach(survey => {
      const code = survey.province_code || 'unknown'
      if (!statsByProvince[code]) {
        const province = getProvinceByCode(code)
        statsByProvince[code] = {
          province_code: code,
          province_name: province?.name || 'Unknown',
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        }
      }

      statsByProvince[code].total++
      if (survey.status === 'pending') statsByProvince[code].pending++
      if (survey.status === 'approved_central' || survey.status === 'approved_commune') {
        statsByProvince[code].approved++
      }
      if (survey.status === 'rejected') statsByProvince[code].rejected++
    })

    return Object.values(statsByProvince).sort((a, b) => b.total - a.total)
  }

  const totalSurveys = surveys.length
  const pendingSurveys = surveys.filter(s => s.status === 'pending' || s.status === 'reviewed').length
  const approvedSurveys = surveys.filter(s =>
    s.status === 'approved_central' || s.status === 'approved_commune'
  ).length
  const assignedIds = surveys.filter(s => s.location_identifier).length

  const handleAdminSelect = (province: string, district: string, commune: string) => {
    setSelectedProvince(province)
    setSelectedDistrict(district)
    setSelectedCommune(commune)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Đang tải bản đồ quốc gia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bản đồ Quốc gia</h1>
        <p className="text-gray-500 mt-1">
          Hệ thống định danh vị trí toàn quốc - {totalSurveys} vị trí
        </p>
      </div>

      {/* National Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tổng số vị trí</p>
                <p className="text-2xl font-bold text-gray-900">{totalSurveys.toLocaleString('vi-VN')}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Chờ phê duyệt</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingSurveys.toLocaleString('vi-VN')}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Đã phê duyệt</p>
                <p className="text-2xl font-bold text-green-600">{approvedSurveys.toLocaleString('vi-VN')}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Đã cấp mã</p>
                <p className="text-2xl font-bold text-purple-600">{assignedIds.toLocaleString('vi-VN')}</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Administrative Selector */}
      <AdminSelector
        onSelect={handleAdminSelect}
        initialProvince={selectedProvince}
        initialDistrict={selectedDistrict}
        initialCommune={selectedCommune}
      />

      {/* Map and Statistics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Interactive Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Bản đồ hành chính Việt Nam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] rounded-lg overflow-hidden">
                <VietnamAdminMap
                  selectedProvince={selectedProvince}
                  selectedDistrict={selectedDistrict}
                  selectedCommune={selectedCommune}
                  onProvinceSelect={setSelectedProvince}
                  showSurveys={true}
                  surveys={surveys.map(s => ({
                    id: s.id,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    location_name: s.location_name || 'Unknown',
                    status: s.status
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Province Statistics */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Thống kê theo tỉnh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {provinceStats.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Chưa có dữ liệu
                  </p>
                ) : (
                  provinceStats.map((stat) => (
                    <div
                      key={stat.province_code}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${selectedProvince === stat.province_code ? 'bg-blue-50 border-blue-300' : 'bg-white'
                        }`}
                      onClick={() => setSelectedProvince(stat.province_code)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{stat.province_name}</h4>
                        <span className="text-xs font-bold text-blue-600">{stat.total}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-yellow-600 font-medium">{stat.pending}</div>
                          <div className="text-gray-500">Chờ</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-600 font-medium">{stat.approved}</div>
                          <div className="text-gray-500">Duyệt</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-600 font-medium">{stat.rejected}</div>
                          <div className="text-gray-500">Từ chối</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${(stat.approved / stat.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
