'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Medal, Award, Star, TrendingUp, Target } from 'lucide-react'

interface OfficerStats {
  id: string
  full_name: string
  police_id: string
  surveys_count: number
  avg_quality: number
  points: number
  rank: number
  badges: string[]
}

interface LeaderboardProps {
  scope?: 'commune' | 'district' | 'national'
  wardId?: number
  provinceId?: number
  limit?: number
}

const BADGE_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  'first_100': { icon: '🌟', label: 'First 100', color: 'bg-yellow-100 text-yellow-800' },
  'accuracy_master': { icon: '🎯', label: 'Accuracy Master', color: 'bg-green-100 text-green-800' },
  'speed_demon': { icon: '⚡', label: 'Speed Demon', color: 'bg-blue-100 text-blue-800' },
  'district_champion': { icon: '🏆', label: 'District Champion', color: 'bg-purple-100 text-purple-800' },
  'quality_king': { icon: '👑', label: 'Quality King', color: 'bg-amber-100 text-amber-800' },
}

export function OfficerLeaderboard({ scope = 'commune', wardId, provinceId, limit = 10 }: LeaderboardProps) {
  const [officers, setOfficers] = useState<OfficerStats[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Get surveys grouped by surveyor
        let query = supabase
          .from('survey_locations')
          .select(`
            surveyor_id,
            accuracy,
            photos,
            location_name,
            address,
            owner_name,
            profiles!inner(id, full_name, police_id)
          `)

        if (scope === 'commune' && wardId) {
          query = query.eq('ward_id', wardId)
        } else if (scope === 'district' && provinceId) {
          query = query.eq('province_id', provinceId)
        }

        const { data, error } = await query

        if (error) throw error

        // Aggregate stats by surveyor
        const statsMap = new Map<string, {
          id: string
          full_name: string
          police_id: string
          surveys: number
          totalQuality: number
        }>()

        data?.forEach((survey: any) => {
          const profile = survey.profiles
          if (!profile) return

          const existing = statsMap.get(profile.id) || {
            id: profile.id,
            full_name: profile.full_name || 'Unknown',
            police_id: profile.police_id || '',
            surveys: 0,
            totalQuality: 0,
          }

          // Calculate simple quality score
          let quality = 50
          if (survey.photos?.length >= 2) quality += 15
          if (survey.accuracy && survey.accuracy <= 10) quality += 15
          if (survey.location_name) quality += 10
          if (survey.address) quality += 10

          existing.surveys++
          existing.totalQuality += quality
          statsMap.set(profile.id, existing)
        })

        // Convert to array and calculate rankings
        const officerStats: OfficerStats[] = Array.from(statsMap.values())
          .map(o => ({
            id: o.id,
            full_name: o.full_name,
            police_id: o.police_id,
            surveys_count: o.surveys,
            avg_quality: o.surveys > 0 ? Math.round(o.totalQuality / o.surveys) : 0,
            points: o.surveys * 10 + Math.round((o.totalQuality / Math.max(o.surveys, 1)) * 0.5),
            rank: 0,
            badges: generateBadges(o.surveys, o.totalQuality / Math.max(o.surveys, 1))
          }))
          .sort((a, b) => b.points - a.points)
          .slice(0, limit)
          .map((o, idx) => ({ ...o, rank: idx + 1 }))

        setOfficers(officerStats)
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [scope, wardId, provinceId, limit]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Bảng xếp hạng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Bảng xếp hạng cán bộ
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({scope === 'commune' ? 'Xã' : scope === 'district' ? 'Huyện' : 'Toàn quốc'})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {officers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Chưa có dữ liệu xếp hạng</p>
          </div>
        ) : (
          <div className="divide-y">
            {officers.map((officer, idx) => (
              <div
                key={officer.id}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                  idx < 3 ? 'bg-gradient-to-r from-yellow-50/50 to-transparent' : ''
                }`}
              >
                {/* Rank */}
                <div className="w-10 flex-shrink-0">
                  {officer.rank === 1 && <span className="text-2xl">🥇</span>}
                  {officer.rank === 2 && <span className="text-2xl">🥈</span>}
                  {officer.rank === 3 && <span className="text-2xl">🥉</span>}
                  {officer.rank > 3 && (
                    <span className="text-lg font-bold text-gray-400">#{officer.rank}</span>
                  )}
                </div>

                {/* Officer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{officer.full_name}</span>
                    {officer.badges.length > 0 && (
                      <div className="flex gap-1">
                        {officer.badges.slice(0, 3).map((badge) => (
                          <span
                            key={badge}
                            className={`text-xs px-1.5 py-0.5 rounded ${BADGE_ICONS[badge]?.color || 'bg-gray-100'}`}
                            title={BADGE_ICONS[badge]?.label || badge}
                          >
                            {BADGE_ICONS[badge]?.icon || '⭐'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">ID: {officer.police_id}</div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{officer.surveys_count}</div>
                    <div className="text-xs text-gray-500">Khảo sát</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">{officer.avg_quality}%</div>
                    <div className="text-xs text-gray-500">Chất lượng</div>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <div className="font-bold text-purple-600 flex items-center justify-center gap-1">
                      <Star className="h-3 w-3" />
                      {officer.points}
                    </div>
                    <div className="text-xs text-gray-500">Điểm</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function generateBadges(surveys: number, avgQuality: number): string[] {
  const badges: string[] = []

  if (surveys >= 100) badges.push('first_100')
  if (avgQuality >= 95) badges.push('accuracy_master')
  if (surveys >= 50) badges.push('speed_demon')
  if (avgQuality >= 90 && surveys >= 30) badges.push('quality_king')

  return badges
}
