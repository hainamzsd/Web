'use client'

import { cn } from '@/lib/utils'

interface QualityScoreProps {
  score: number
  showBreakdown?: boolean
  breakdown?: {
    photoQuality: number
    gpsAccuracy: number
    completeness: number
    consistency: number
  }
  size?: 'sm' | 'md' | 'lg'
}

export function QualityScore({ score, showBreakdown = false, breakdown, size = 'md' }: QualityScoreProps) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-600 bg-green-100 border-green-300'
    if (s >= 70) return 'text-blue-600 bg-blue-100 border-blue-300'
    if (s >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-300'
    return 'text-red-600 bg-red-100 border-red-300'
  }

  const getTrack = (s: number) => {
    if (s >= 90) return { label: 'Fast Track', color: 'bg-green-500', icon: '⚡' }
    if (s >= 70) return { label: 'Normal', color: 'bg-blue-500', icon: '📋' }
    return { label: 'Cần xem xét', color: 'bg-yellow-500', icon: '🔍' }
  }

  const track = getTrack(score)

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-3xl'
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Score Circle */}
      <div className={cn(
        'rounded-full border-4 flex items-center justify-center font-bold',
        sizeClasses[size],
        getScoreColor(score)
      )}>
        {score}
      </div>

      {/* Track Badge */}
      <div className={cn(
        'px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-1',
        track.color
      )}>
        <span>{track.icon}</span>
        <span>{track.label}</span>
      </div>

      {/* Breakdown */}
      {showBreakdown && breakdown && (
        <div className="mt-3 w-full space-y-2">
          <ScoreBar label="Ảnh" score={breakdown.photoQuality} max={25} />
          <ScoreBar label="GPS" score={breakdown.gpsAccuracy} max={25} />
          <ScoreBar label="Đầy đủ" score={breakdown.completeness} max={25} />
          <ScoreBar label="Nhất quán" score={breakdown.consistency} max={25} />
        </div>
      )}
    </div>
  )
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = (score / max) * 100

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-600">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all',
            percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-blue-500' : 'bg-yellow-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium">{score}</span>
    </div>
  )
}

// Utility function to calculate quality score based on real survey data
export function calculateQualityScore(survey: {
  photos?: string[]
  accuracy?: number | null
  location_name?: string | null
  address?: string | null
  owner_name?: string | null
  owner_phone?: string | null
  owner_id_number?: string | null
  polygon_geometry?: unknown
  latitude?: number
  longitude?: number
  object_type?: string | null
  land_use_type?: string | null
  notes?: string | null
}) {
  let photoQuality = 0
  let gpsAccuracy = 0
  let completeness = 0
  let consistency = 0

  // Photo quality (0-25) - based on number of photos
  const photoCount = survey.photos?.length || 0
  if (photoCount >= 4) photoQuality = 25
  else if (photoCount >= 3) photoQuality = 22
  else if (photoCount >= 2) photoQuality = 18
  else if (photoCount >= 1) photoQuality = 12
  else photoQuality = 0

  // GPS accuracy (0-25) - based on accuracy in meters
  const accuracy = survey.accuracy
  if (accuracy === null || accuracy === undefined) {
    gpsAccuracy = 15 // Default if no accuracy data
  } else if (accuracy <= 5) {
    gpsAccuracy = 25
  } else if (accuracy <= 10) {
    gpsAccuracy = 22
  } else if (accuracy <= 20) {
    gpsAccuracy = 18
  } else if (accuracy <= 50) {
    gpsAccuracy = 12
  } else {
    gpsAccuracy = 5
  }

  // Completeness (0-25) - count filled fields
  const requiredFields = [
    survey.location_name,
    survey.address,
    survey.owner_name,
    survey.object_type,
    survey.land_use_type
  ]
  const optionalFields = [
    survey.owner_phone,
    survey.owner_id_number,
    survey.polygon_geometry,
    survey.notes
  ]

  const requiredFilled = requiredFields.filter(Boolean).length
  const optionalFilled = optionalFields.filter(Boolean).length

  // Required fields worth 20 points, optional worth 5
  completeness = Math.round((requiredFilled / requiredFields.length) * 20) +
                 Math.round((optionalFilled / optionalFields.length) * 5)

  // Consistency (0-25) - check data coherence
  let consistencyChecks = 0
  const totalChecks = 5

  // Check 1: Has valid GPS coordinates
  if (survey.latitude && survey.longitude &&
      survey.latitude >= -90 && survey.latitude <= 90 &&
      survey.longitude >= -180 && survey.longitude <= 180) {
    consistencyChecks++
  }

  // Check 2: Location name is reasonable length
  if (survey.location_name && survey.location_name.length >= 3 && survey.location_name.length <= 200) {
    consistencyChecks++
  }

  // Check 3: Address is reasonable length
  if (survey.address && survey.address.length >= 5 && survey.address.length <= 500) {
    consistencyChecks++
  }

  // Check 4: If owner phone exists, check format (Vietnamese phone)
  if (!survey.owner_phone || /^(0|\+84)[0-9]{9,10}$/.test(survey.owner_phone.replace(/\s/g, ''))) {
    consistencyChecks++
  }

  // Check 5: If owner ID exists, check format (Vietnamese ID: 9 or 12 digits)
  if (!survey.owner_id_number || /^[0-9]{9}$|^[0-9]{12}$/.test(survey.owner_id_number.replace(/\s/g, ''))) {
    consistencyChecks++
  }

  consistency = Math.round((consistencyChecks / totalChecks) * 25)

  const total = photoQuality + gpsAccuracy + completeness + consistency

  return {
    total: Math.min(total, 100), // Cap at 100
    breakdown: { photoQuality, gpsAccuracy, completeness, consistency }
  }
}
