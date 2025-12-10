'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Database } from '@/lib/types/database'
import { LocationIdentifierData } from './traffic-light-marker'
import { Map, Box, Loader2 } from 'lucide-react'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

// Dynamic imports for both map components
const EnhancedSurveyMap = dynamic(
  () => import('./enhanced-survey-map').then(mod => ({ default: mod.EnhancedSurveyMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Đang tải bản đồ 2D...</p>
        </div>
      </div>
    )
  }
)

const Map3D = dynamic(
  () => import('./map-3d').then(mod => ({ default: mod.Map3D })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Đang tải bản đồ 3D...</p>
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
  defaultMode?: '2d' | '3d'
  showModeToggle?: boolean
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
  locationIdentifiers = {},
  defaultMode = '2d',
  showModeToggle = true
}: SurveyMapWrapperProps) {
  const [mapMode, setMapMode] = useState<'2d' | '3d'>(defaultMode)

  return (
    <div className="relative w-full" style={{ height }}>
      {/* 2D/3D Toggle Button */}
      {showModeToggle && (
        <div className="absolute top-3 left-3 z-[1002] flex bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          <button
            onClick={() => setMapMode('2d')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mapMode === '2d'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Map className="h-4 w-4" />
            2D
          </button>
          <button
            onClick={() => setMapMode('3d')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              mapMode === '3d'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Box className="h-4 w-4" />
            3D
          </button>
        </div>
      )}

      {/* Map Container */}
      <div className="absolute inset-0">
        {mapMode === '2d' ? (
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
        ) : (
          <Map3D
            surveys={surveys}
            center={[center[1], center[0]]} // MapLibre uses [lng, lat]
            zoom={zoom}
            height="100%"
            showSearch={showSearch}
            baseDetailUrl={baseDetailUrl}
            locationIdentifiers={locationIdentifiers}
            onSurveySelect={onSurveySelect}
          />
        )}
      </div>
    </div>
  )
}

export default SurveyMapWrapper
