'use client'

import dynamic from 'next/dynamic'
import { Database } from '@/lib/types/database'
import { LocationIdentifierData } from './traffic-light-marker'
import { Loader2 } from 'lucide-react'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

// Dynamic import for Leaflet map (only map provider)
const EnhancedSurveyMap = dynamic(
  () => import('./enhanced-survey-map').then(mod => ({ default: mod.EnhancedSurveyMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Đang tải bản đồ...</p>
        </div>
      </div>
    )
  }
)

interface SurveyMapWrapperProps {
  surveys: SurveyLocation[]
  center?: [number, number]
  zoom?: number
  showHeatmap?: boolean
  showClustering?: boolean
  enableDrawing?: boolean
  onPolygonDrawn?: (polygon: any) => void
  selectedSurveyId?: string | null
  onSurveySelect?: (survey: SurveyLocation | null) => void
  showInfoCard?: boolean
  height?: string
  showSearch?: boolean
  baseDetailUrl?: string
  locationIdentifiers?: Record<string, LocationIdentifierData>
}

export function SurveyMapWrapper({
  surveys,
  center = [16.0, 108.0],
  zoom = 6,
  showHeatmap = false,
  showClustering = false,
  enableDrawing = false,
  onPolygonDrawn,
  selectedSurveyId,
  onSurveySelect,
  showInfoCard = true,
  height = '600px',
  showSearch = true,
  baseDetailUrl = '/commune/surveys',
  locationIdentifiers = {}
}: SurveyMapWrapperProps) {
  return (
    <div className="relative w-full" style={{ height }}>
      <EnhancedSurveyMap
        surveys={surveys}
        center={center}
        zoom={zoom}
        showHeatmap={showHeatmap}
        showClustering={showClustering}
        enableDrawing={enableDrawing}
        onPolygonDrawn={onPolygonDrawn}
        selectedSurveyId={selectedSurveyId}
        onSurveySelect={onSurveySelect}
        showInfoCard={showInfoCard}
        height="100%"
        showSearch={showSearch}
        baseDetailUrl={baseDetailUrl}
        locationIdentifiers={locationIdentifiers}
      />
    </div>
  )
}

export default SurveyMapWrapper
