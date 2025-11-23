'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet.heat'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface EnhancedSurveyMapProps {
  surveys: SurveyLocation[]
  center?: [number, number]
  zoom?: number
  showHeatmap?: boolean
  showClustering?: boolean
  enableDrawing?: boolean
  onPolygonDrawn?: (polygon: any) => void
  selectedSurveyId?: string | null
}

// Fix marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

function EnhancedSurveyMapComponent({
  surveys,
  center = [16.0, 108.0],
  zoom = 6,
  showHeatmap = false,
  showClustering = false,
  enableDrawing = false,
  onPolygonDrawn,
  selectedSurveyId
}: EnhancedSurveyMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const heatmapLayerRef = useRef<any>(null)
  const drawControlRef = useRef<any>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap' | 'clusters'>('markers')

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initialize map
    if (!mapRef.current) {
      const map = L.map('enhanced-map', {
        center,
        zoom,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map

      // Initialize drawn items layer for polygon drawing
      if (enableDrawing) {
        import('leaflet-draw').then((module) => {
          const drawnItems = new L.FeatureGroup()
          map.addLayer(drawnItems)
          drawnItemsRef.current = drawnItems

          const drawControl = new (L.Control as any).Draw({
            edit: {
              featureGroup: drawnItems,
              edit: true,
              remove: true,
            },
            draw: {
              polygon: {
                allowIntersection: false,
                showArea: true,
                drawError: {
                  color: '#e74c3c',
                  message: '<strong>Lỗi:</strong> Không thể vẽ đa giác giao nhau!',
                },
                shapeOptions: {
                  color: '#3b82f6',
                  weight: 3,
                  fillOpacity: 0.3,
                },
              },
              rectangle: {
                shapeOptions: {
                  color: '#10b981',
                  weight: 3,
                  fillOpacity: 0.3,
                },
              },
              circle: false,
              circlemarker: false,
              marker: true,
              polyline: {
                shapeOptions: {
                  color: '#f59e0b',
                  weight: 3,
                },
              },
            },
          })

          map.addControl(drawControl)
          drawControlRef.current = drawControl

          // Handle polygon creation
          map.on(L.Draw.Event.CREATED, (e: any) => {
            const layer = e.layer
            drawnItems.addLayer(layer)

            if (e.layerType === 'polygon' || e.layerType === 'rectangle') {
              const geoJSON = layer.toGeoJSON()
              onPolygonDrawn?.(geoJSON)
            }
          })
        })
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update map based on mode
  useEffect(() => {
    if (!mapRef.current || surveys.length === 0) return

    // Clear existing layers
    if (markerLayerRef.current) {
      markerLayerRef.current.remove()
      markerLayerRef.current = null
    }
    if (heatmapLayerRef.current) {
      mapRef.current.removeLayer(heatmapLayerRef.current)
      heatmapLayerRef.current = null
    }

    const validSurveys = surveys.filter(s => s.latitude && s.longitude)

    if (validSurveys.length === 0) return

    if (showHeatmap || mapMode === 'heatmap') {
      // Heatmap mode
      const heatPoints = validSurveys.map(survey => [
        survey.latitude!,
        survey.longitude!,
        0.5, // intensity
      ]) as [number, number, number][]

      const heat = (L as any).heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.0: '#3b82f6',
          0.5: '#f59e0b',
          1.0: '#ef4444',
        },
      }).addTo(mapRef.current)

      heatmapLayerRef.current = heat
    } else if (showClustering || mapMode === 'clusters') {
      // Clustering mode
      import('leaflet.markercluster').then(() => {
        const markers = (L as any).markerClusterGroup({
          chunkedLoading: true,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          maxClusterRadius: 80,
          iconCreateFunction: (cluster: any) => {
            const count = cluster.getChildCount()
            let className = 'marker-cluster-'
            if (count < 10) className += 'small'
            else if (count < 50) className += 'medium'
            else className += 'large'

            return L.divIcon({
              html: `<div><span>${count}</span></div>`,
              className: className,
              iconSize: new L.Point(40, 40),
            })
          },
        })

        validSurveys.forEach(survey => {
          const marker = L.marker([survey.latitude!, survey.longitude!])
          const statusColor =
            survey.status === 'published' ? '#10b981' :
            survey.status === 'approved_central' ? '#3b82f6' :
            survey.status === 'approved_commune' ? '#8b5cf6' :
            survey.status === 'reviewed' ? '#0ea5e9' :
            survey.status === 'rejected' ? '#ef4444' :
            '#f59e0b'

          marker.bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="font-weight: bold; margin-bottom: 8px; color: ${statusColor};">
                ${survey.location_name || 'Chưa đặt tên'}
              </h3>
              <p style="font-size: 12px; color: #666; margin-bottom: 4px;">
                ${survey.address || 'N/A'}
              </p>
              <p style="font-size: 11px; color: #999;">
                Trạng thái: <strong style="color: ${statusColor};">${survey.status}</strong>
              </p>
              ${survey.owner_name ? `<p style="font-size: 11px; color: #666;">Chủ sở hữu: ${survey.owner_name}</p>` : ''}
              <a href="/commune/surveys/${survey.id}" style="color: #3b82f6; text-decoration: underline; font-size: 12px;">
                Xem chi tiết →
              </a>
            </div>
          `)

          markers.addLayer(marker)
        })

        mapRef.current?.addLayer(markers)
        markerLayerRef.current = markers
      })
    } else {
      // Regular markers mode
      const markerLayer = L.layerGroup()

      validSurveys.forEach(survey => {
        const statusColor =
          survey.status === 'published' ? '#10b981' :
          survey.status === 'approved_central' ? '#3b82f6' :
          survey.status === 'approved_commune' ? '#8b5cf6' :
          survey.status === 'reviewed' ? '#0ea5e9' :
          survey.status === 'rejected' ? '#ef4444' :
          '#f59e0b'

        const isSelected = selectedSurveyId === survey.id

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              background-color: ${statusColor};
              width: ${isSelected ? '32px' : '24px'};
              height: ${isSelected ? '32px' : '24px'};
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
              transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
              transition: all 0.2s;
            "></div>
          `,
          iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
          iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12],
        })

        const marker = L.marker([survey.latitude!, survey.longitude!], { icon })

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: ${statusColor};">
              ${survey.location_name || 'Chưa đặt tên'}
            </h3>
            <p style="font-size: 12px; color: #666; margin-bottom: 4px;">
              ${survey.address || 'N/A'}
            </p>
            <p style="font-size: 11px; color: #999;">
              Trạng thái: <strong style="color: ${statusColor};">${survey.status}</strong>
            </p>
            ${survey.owner_name ? `<p style="font-size: 11px; color: #666;">Chủ sở hữu: ${survey.owner_name}</p>` : ''}
            <a href="/commune/surveys/${survey.id}" style="color: #3b82f6; text-decoration: underline; font-size: 12px;">
              Xem chi tiết →
            </a>
          </div>
        `)

        markerLayer.addLayer(marker)
      })

      markerLayer.addTo(mapRef.current)
      markerLayerRef.current = markerLayer

      // Fit bounds
      const bounds = L.latLngBounds(validSurveys.map(s => [s.latitude!, s.longitude!]))
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
  }, [surveys, mapMode, showHeatmap, showClustering, selectedSurveyId])

  return (
    <div className="relative">
      <div id="enhanced-map" className="w-full h-[600px] rounded-lg shadow-lg border-2 border-gray-200 z-0"></div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button
          onClick={() => setMapMode('markers')}
          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
            mapMode === 'markers'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Điểm đánh dấu
        </button>
        <button
          onClick={() => setMapMode('clusters')}
          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
            mapMode === 'clusters'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Nhóm cụm
        </button>
        <button
          onClick={() => setMapMode('heatmap')}
          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
            mapMode === 'heatmap'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Bản đồ nhiệt
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
        <h4 className="font-semibold text-sm mb-2">Trạng thái</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Chờ xử lý</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-500"></div>
            <span>Đã xem xét</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Đã duyệt xã</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Đã duyệt TW</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Đã công bố</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Từ chối</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export with dynamic import to avoid SSR issues
export const EnhancedSurveyMap = dynamic(
  () => Promise.resolve(EnhancedSurveyMapComponent),
  { ssr: false }
)
