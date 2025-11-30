'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Database } from '@/lib/types/database'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

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
  onSurveySelect?: (survey: SurveyLocation | null) => void
}

function EnhancedSurveyMapComponent({
  surveys,
  center = [16.0, 108.0],
  zoom = 6,
  showHeatmap = false,
  showClustering = false,
  enableDrawing = false,
  onPolygonDrawn,
  selectedSurveyId,
  onSurveySelect
}: EnhancedSurveyMapProps) {
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const markerLayerRef = useRef<any>(null)
  const heatmapLayerRef = useRef<any>(null)
  const drawControlRef = useRef<any>(null)
  const drawnItemsRef = useRef<any>(null)
  const polygonLayerRef = useRef<any>(null)
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap' | 'clusters'>('markers')
  const [mapId] = useState(`enhanced-map-${Math.random().toString(36).substr(2, 9)}`)
  const [isMapReady, setIsMapReady] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyLocation | null>(null)

  // Helper function to parse polygon geometry
  const parsePolygonGeometry = (geometry: any): [number, number][] => {
    if (!geometry) return []

    try {
      // Handle GeoJSON format
      if (typeof geometry === 'object' && geometry !== null) {
        if (geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
          // GeoJSON is [lng, lat] but Leaflet expects [lat, lng]
          return geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number])
        }
      }

      // Handle array of [lat, lng] points
      if (Array.isArray(geometry)) {
        return geometry.map((point: any) => {
          if (Array.isArray(point) && point.length >= 2) {
            return [point[0], point[1]] as [number, number]
          }
          if (typeof point === 'object' && point !== null) {
            return [point.lat || point.latitude || 0, point.lng || point.longitude || 0] as [number, number]
          }
          return [0, 0] as [number, number]
        })
      }
    } catch (e) {
      console.error('Error parsing polygon geometry:', e)
    }

    return []
  }

  // Display polygon for selected survey
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !isMapReady) return

    const L = leafletRef.current

    // Clear existing polygon layer
    if (polygonLayerRef.current) {
      mapRef.current.removeLayer(polygonLayerRef.current)
      polygonLayerRef.current = null
    }

    // Draw polygon if selected survey has polygon_geometry
    if (selectedSurvey && selectedSurvey.polygon_geometry) {
      const positions = parsePolygonGeometry(selectedSurvey.polygon_geometry)

      if (positions.length > 0) {
        const polygon = L.polygon(positions, {
          color: '#3b82f6',
          weight: 3,
          fillColor: '#3b82f6',
          fillOpacity: 0.2
        }).addTo(mapRef.current)

        polygon.bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px; color: #3b82f6;">
              ${selectedSurvey.location_name || 'Chưa đặt tên'}
            </h3>
            <p style="font-size: 12px; color: #666;">
              Diện tích: ${selectedSurvey.land_area_m2 ? selectedSurvey.land_area_m2.toLocaleString('vi-VN') + ' m²' : 'Chưa xác định'}
            </p>
            ${selectedSurvey.owner_name ? `<p style="font-size: 11px; color: #666;">Chủ sở hữu: ${selectedSurvey.owner_name}</p>` : ''}
          </div>
        `)

        polygonLayerRef.current = polygon

        // Fit map to polygon bounds
        mapRef.current.fitBounds(polygon.getBounds(), { padding: [50, 50], maxZoom: 18 })
      }
    }
  }, [selectedSurvey, isMapReady])

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const initMap = async () => {
      // Dynamically import leaflet
      const L = await import('leaflet')

      if (!mounted) return

      leafletRef.current = L.default || L

      // Fix marker icons
      delete (leafletRef.current.Icon.Default.prototype as any)._getIconUrl
      leafletRef.current.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })

      const mapElement = document.getElementById(mapId)
      if (!mapElement || mapRef.current) return

      const map = leafletRef.current.map(mapId, {
        center,
        zoom,
        zoomControl: true,
      })

      leafletRef.current.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map

      // Initialize drawn items layer for polygon drawing
      if (enableDrawing) {
        await import('leaflet-draw')

        if (!mounted) return

        const drawnItems = new leafletRef.current.FeatureGroup()
        map.addLayer(drawnItems)
        drawnItemsRef.current = drawnItems

        const drawControl = new (leafletRef.current.Control as any).Draw({
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
        map.on(leafletRef.current.Draw.Event.CREATED, (e: any) => {
          const layer = e.layer
          drawnItems.addLayer(layer)

          if (e.layerType === 'polygon' || e.layerType === 'rectangle') {
            const geoJSON = layer.toGeoJSON()
            onPolygonDrawn?.(geoJSON)
          }
        })
      }

      setIsMapReady(true)
    }

    initMap()

    return () => {
      mounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [mapId])

  // Update map based on mode
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !isMapReady || surveys.length === 0) return

    const L = leafletRef.current

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

    const updateMarkers = async () => {
      if (showHeatmap || mapMode === 'heatmap') {
        // Heatmap mode
        await import('leaflet.heat')

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
        await import('leaflet.markercluster')

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

          const hasPolygon = survey.polygon_geometry !== null

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
              ${hasPolygon ? '<p style="font-size: 11px; color: #3b82f6;">📐 Có dữ liệu ranh giới</p>' : ''}
              <a href="/commune/surveys/${survey.id}" style="color: #3b82f6; text-decoration: underline; font-size: 12px;">
                Xem chi tiết →
              </a>
            </div>
          `)

          marker.on('click', () => {
            setSelectedSurvey(survey)
            if (onSurveySelect) {
              onSurveySelect(survey)
            }
          })

          markers.addLayer(marker)
        })

        mapRef.current?.addLayer(markers)
        markerLayerRef.current = markers
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

          const hasPolygon = survey.polygon_geometry !== null

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
              ${hasPolygon ? '<p style="font-size: 11px; color: #3b82f6;">📐 Có dữ liệu ranh giới</p>' : ''}
              <a href="/commune/surveys/${survey.id}" style="color: #3b82f6; text-decoration: underline; font-size: 12px;">
                Xem chi tiết →
              </a>
            </div>
          `)

          marker.on('click', () => {
            setSelectedSurvey(survey)
            if (onSurveySelect) {
              onSurveySelect(survey)
            }
          })

          markerLayer.addLayer(marker)
        })

        markerLayer.addTo(mapRef.current)
        markerLayerRef.current = markerLayer

        // Fit bounds
        const bounds = L.latLngBounds(validSurveys.map(s => [s.latitude!, s.longitude!]))
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      }
    }

    updateMarkers()
  }, [surveys, mapMode, showHeatmap, showClustering, selectedSurveyId, isMapReady])

  return (
    <div className="relative">
      <div id={mapId} className="w-full h-[600px] rounded-lg shadow-lg border-2 border-gray-200 z-0"></div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 space-y-2">
        <button
          onClick={() => setMapMode('markers')}
          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${mapMode === 'markers'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Điểm đánh dấu
        </button>
        <button
          onClick={() => setMapMode('clusters')}
          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${mapMode === 'clusters'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Nhóm cụm
        </button>
        <button
          onClick={() => setMapMode('heatmap')}
          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${mapMode === 'heatmap'
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
