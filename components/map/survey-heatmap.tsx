'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

// Extend Leaflet types for heatmap
declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: Record<string, unknown>
  ): L.Layer
}

interface SurveyHeatmapProps {
  surveys: Array<{
    latitude: number
    longitude: number
    status?: string
  }>
  intensity?: number
  radius?: number
  blur?: number
  maxZoom?: number
}

export function SurveyHeatmap({
  surveys,
  intensity = 0.5,
  radius = 25,
  blur = 15,
  maxZoom = 17
}: SurveyHeatmapProps) {
  const map = useMap()

  useEffect(() => {
    if (!surveys || surveys.length === 0) return

    // Convert surveys to heatmap format: [lat, lng, intensity]
    const heatmapData: Array<[number, number, number]> = surveys.map(survey => [
      survey.latitude,
      survey.longitude,
      intensity
    ])

    // Create heatmap layer
    const heatLayer = (L as typeof L & { heatLayer: typeof L.heatLayer }).heatLayer(heatmapData, {
      radius,
      blur,
      maxZoom,
      gradient: {
        0.0: 'blue',
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
    })

    // Add to map
    heatLayer.addTo(map)

    // Cleanup
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, surveys, intensity, radius, blur, maxZoom])

  return null
}

// Status-based heatmap (different colors for different statuses)
export function StatusHeatmap({
  surveys,
  radius = 20,
  blur = 15
}: {
  surveys: Array<{
    latitude: number
    longitude: number
    status: string
  }>
  radius?: number
  blur?: number
}) {
  const map = useMap()

  useEffect(() => {
    if (!surveys || surveys.length === 0) return

    const layers: L.Layer[] = []

    // Group by status
    const byStatus: Record<string, typeof surveys> = {}
    surveys.forEach(survey => {
      if (!byStatus[survey.status]) {
        byStatus[survey.status] = []
      }
      byStatus[survey.status].push(survey)
    })

    // Color schemes for different statuses
    const statusColors: Record<string, Record<string, string>> = {
      pending: {
        0.0: '#FEF3C7',
        0.5: '#FCD34D',
        1.0: '#F59E0B'
      },
      reviewed: {
        0.0: '#DBEAFE',
        0.5: '#60A5FA',
        1.0: '#2563EB'
      },
      approved_commune: {
        0.0: '#D1FAE5',
        0.5: '#34D399',
        1.0: '#059669'
      },
      approved_central: {
        0.0: '#A7F3D0',
        0.5: '#10B981',
        1.0: '#047857'
      },
      rejected: {
        0.0: '#FEE2E2',
        0.5: '#EF4444',
        1.0: '#DC2626'
      }
    }

    // Create heatmap layer for each status
    Object.entries(byStatus).forEach(([status, statusSurveys]) => {
      const heatmapData: Array<[number, number, number]> = statusSurveys.map(s => [
        s.latitude,
        s.longitude,
        0.5
      ])

      const layer = (L as typeof L & { heatLayer: typeof L.heatLayer }).heatLayer(heatmapData, {
        radius,
        blur,
        maxZoom: 17,
        gradient: statusColors[status] || statusColors.pending
      })

      layer.addTo(map)
      layers.push(layer)
    })

    // Cleanup
    return () => {
      layers.forEach(layer => map.removeLayer(layer))
    }
  }, [map, surveys, radius, blur])

  return null
}
