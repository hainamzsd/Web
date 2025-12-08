'use client'

import { useEffect, useState, useId, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, CircleMarker } from 'react-leaflet'
import type { DivIcon, LatLngExpression, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { VIETNAM_BOUNDS } from '@/lib/map/vietnam-administrative-data'
import { Json } from '@/lib/types/database'
import { X, ZoomIn, Layers, MapPin, Flame, Grid3X3, ExternalLink, Navigation } from 'lucide-react'

interface SurveyData {
  id: string
  latitude: number
  longitude: number
  location_name: string
  status: string
  polygon_geometry?: Json | null
  address?: string
  owner_name?: string
  land_area_m2?: number | null
}

interface VietnamAdminMapProps {
  selectedProvince?: string
  selectedDistrict?: string
  selectedCommune?: string
  onProvinceSelect?: (code: string) => void
  onDistrictSelect?: (code: string) => void
  onCommuneSelect?: (code: string) => void
  showSurveys?: boolean
  surveys?: SurveyData[]
  onSurveySelect?: (survey: SurveyData | null) => void
}

type ViewMode = 'markers' | 'heatmap' | 'clusters'

// Status colors with better contrast
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pending: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', label: 'Chờ xử lý' },
  reviewed: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', label: 'Đã xem xét' },
  approved_commune: { bg: '#D1FAE5', border: '#10B981', text: '#065F46', label: 'Xã đã duyệt' },
  approved_central: { bg: '#CFFAFE', border: '#06B6D4', text: '#155E75', label: 'TW đã duyệt' },
  rejected: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', label: 'Đã từ chối' },
  published: { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6', label: 'Đã công bố' },
  default: { bg: '#F3F4F6', border: '#6B7280', text: '#374151', label: 'Không xác định' }
}

// Map bounds controller with animation
function MapBoundsController({ bounds, animated = true }: { bounds: [[number, number], [number, number]]; animated?: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (animated) {
      map.flyToBounds(bounds, { duration: 0.8, padding: [20, 20] })
    } else {
      map.fitBounds(bounds)
    }
  }, [map, bounds, animated])

  return null
}

// Fly to location component
function FlyToLocation({
  position,
  zoom = 16,
  enabled
}: {
  position: [number, number] | null;
  zoom?: number;
  enabled: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (enabled && position) {
      map.flyTo(position, zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      })
    }
  }, [map, position, zoom, enabled])

  return null
}

export function VietnamAdminMap({
  showSurveys = true,
  surveys = [],
  onSurveySelect
}: VietnamAdminMapProps) {
  const mapId = useId()
  const [mapBounds] = useState<[[number, number], [number, number]]>(VIETNAM_BOUNDS)
  const [isClient, setIsClient] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [markerIcons, setMarkerIcons] = useState<Record<string, DivIcon>>({})
  const [selectedMarkerIcons, setSelectedMarkerIcons] = useState<Record<string, DivIcon>>({})
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyData | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('markers')
  const [flyToTarget, setFlyToTarget] = useState<[number, number] | null>(null)
  const [shouldFly, setShouldFly] = useState(false)
  const [hoveredSurvey, setHoveredSurvey] = useState<string | null>(null)

  useEffect(() => {
    setIsClient(true)

    // Small delay to ensure DOM is ready before mounting map
    const timer = setTimeout(() => {
      setMapReady(true)
    }, 100)

    // Initialize marker icons on client side
    const initIcons = async () => {
      const L = await import('leaflet')

      const icons: Record<string, DivIcon> = {}
      const selectedIcons: Record<string, DivIcon> = {}

      Object.entries(STATUS_COLORS).forEach(([status, colors]) => {
        // Normal marker - modern pin design with pulse animation
        icons[status] = L.default.divIcon({
          className: 'custom-marker-wrapper',
          html: `
            <div class="marker-container" style="position: relative; width: 32px; height: 40px;">
              <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 28px;
                height: 35px;
                background: linear-gradient(135deg, ${colors.border} 0%, ${colors.border}dd 100%);
                border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                box-shadow: 0 3px 10px rgba(0,0,0,0.3), inset 0 -3px 8px rgba(0,0,0,0.2);
                border: 2px solid white;
              ">
                <div style="
                  position: absolute;
                  top: 6px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 10px;
                  height: 10px;
                  background: white;
                  border-radius: 50%;
                  opacity: 0.9;
                "></div>
              </div>
            </div>
          `,
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -35]
        })

        // Selected marker - larger with pulse animation
        selectedIcons[status] = L.default.divIcon({
          className: 'custom-marker-wrapper selected',
          html: `
            <div class="marker-container" style="position: relative; width: 44px; height: 54px;">
              <div class="pulse-ring" style="
                position: absolute;
                bottom: 8px;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 50px;
                background: ${colors.border}40;
                border-radius: 50%;
                animation: pulse 1.5s ease-out infinite;
              "></div>
              <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 38px;
                height: 48px;
                background: linear-gradient(135deg, ${colors.border} 0%, ${colors.border}ee 100%);
                border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4), inset 0 -4px 10px rgba(0,0,0,0.2), 0 0 20px ${colors.border}60;
                border: 3px solid white;
                animation: bounce 0.5s ease-out;
              ">
                <div style="
                  position: absolute;
                  top: 8px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 14px;
                  height: 14px;
                  background: white;
                  border-radius: 50%;
                "></div>
              </div>
            </div>
          `,
          iconSize: [44, 54],
          iconAnchor: [22, 54],
          popupAnchor: [0, -48]
        })
      })

      setMarkerIcons(icons)
      setSelectedMarkerIcons(selectedIcons)
    }
    initIcons()

    return () => {
      clearTimeout(timer)
      setMapReady(false)
    }
  }, [])

  const getMarkerIcon = (status: string, isSelected: boolean = false) => {
    const icons = isSelected ? selectedMarkerIcons : markerIcons
    return icons[status] || icons['default']
  }

  // Convert polygon_geometry to LatLngExpression array for react-leaflet
  const getPolygonPositions = (geometry: Json | null | undefined): LatLngExpression[] => {
    if (!geometry) return []

    try {
      // Handle GeoJSON format
      if (typeof geometry === 'object' && geometry !== null) {
        const geo = geometry as { type?: string; coordinates?: number[][][] }
        if (geo.type === 'Polygon' && geo.coordinates && geo.coordinates[0]) {
          // GeoJSON is [lng, lat] but Leaflet expects [lat, lng]
          return geo.coordinates[0].map(coord => [coord[1], coord[0]] as LatLngExpression)
        }
      }

      // Handle array of [lat, lng] points
      if (Array.isArray(geometry)) {
        return geometry.map(point => {
          if (Array.isArray(point) && point.length >= 2) {
            return [point[0], point[1]] as LatLngExpression
          }
          if (typeof point === 'object' && point !== null) {
            const p = point as { lat?: number; lng?: number; latitude?: number; longitude?: number }
            return [p.lat || p.latitude || 0, p.lng || p.longitude || 0] as LatLngExpression
          }
          return [0, 0] as LatLngExpression
        })
      }
    } catch (e) {
      console.error('Error parsing polygon geometry:', e)
    }

    return []
  }

  const handleSurveyClick = useCallback((survey: SurveyData) => {
    setSelectedSurvey(survey)
    setFlyToTarget([survey.latitude, survey.longitude])
    setShouldFly(true)

    // Reset fly trigger after animation
    setTimeout(() => setShouldFly(false), 1500)

    if (onSurveySelect) {
      onSurveySelect(survey)
    }
  }, [onSurveySelect])

  const handleCloseSurveyPanel = useCallback(() => {
    setSelectedSurvey(null)
    if (onSurveySelect) {
      onSurveySelect(null)
    }
  }, [onSurveySelect])

  const handleFitAllSurveys = useCallback(() => {
    if (surveys.length === 0) return

    const lats = surveys.map(s => s.latitude)
    const lngs = surveys.map(s => s.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // This will be handled by the MapBoundsController
    // For now, just trigger a re-render that fits all surveys
  }, [surveys])

  const getStatusInfo = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS['default']
  }

  if (!isClient || !mapReady) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center rounded-lg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 font-medium">Đang tải bản đồ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: translateX(-50%) scale(1); opacity: 0.8; }
          100% { transform: translateX(-50%) scale(2); opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-8px); }
        }
        .custom-marker-wrapper {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .leaflet-popup-tip {
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
      `}</style>

      <MapContainer
        key={`vietnam-admin-map-${mapId}`}
        bounds={mapBounds}
        zoom={6}
        scrollWheelZoom={true}
        className="w-full h-full rounded-lg"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapBoundsController bounds={mapBounds} animated={false} />

        {/* Fly to selected survey */}
        <FlyToLocation position={flyToTarget} zoom={17} enabled={shouldFly} />

        {/* Heatmap mode - simple circles */}
        {viewMode === 'heatmap' && showSurveys && surveys.map((survey) => (
          <CircleMarker
            key={`heat-${survey.id}`}
            center={[survey.latitude, survey.longitude]}
            radius={20}
            pathOptions={{
              color: 'transparent',
              fillColor: getStatusInfo(survey.status).border,
              fillOpacity: 0.4
            }}
          />
        ))}

        {/* Cluster mode - grouped circles */}
        {viewMode === 'clusters' && showSurveys && surveys.map((survey) => (
          <CircleMarker
            key={`cluster-${survey.id}`}
            center={[survey.latitude, survey.longitude]}
            radius={8}
            pathOptions={{
              color: 'white',
              weight: 2,
              fillColor: getStatusInfo(survey.status).border,
              fillOpacity: 0.9
            }}
            eventHandlers={{
              click: () => handleSurveyClick(survey)
            }}
          />
        ))}

        {/* Survey markers - default mode */}
        {viewMode === 'markers' && showSurveys && Object.keys(markerIcons).length > 0 && surveys.map((survey) => {
          const isSelected = selectedSurvey?.id === survey.id
          const statusInfo = getStatusInfo(survey.status)

          return (
            <Marker
              key={survey.id}
              position={[survey.latitude, survey.longitude]}
              icon={getMarkerIcon(survey.status, isSelected)}
              eventHandlers={{
                click: () => handleSurveyClick(survey)
              }}
            >
              <Popup>
                <div className="p-3 min-w-[250px]">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-base text-gray-900 leading-tight">
                      {survey.location_name || 'Chưa đặt tên'}
                    </h3>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium shrink-0 ml-2"
                      style={{
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.text,
                        border: `1px solid ${statusInfo.border}`
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {survey.address && (
                    <p className="text-sm text-gray-600 mb-2 flex items-start gap-1">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                      {survey.address}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {survey.owner_name && (
                      <div>
                        <span className="text-gray-500">Chủ sở hữu:</span>
                        <p className="font-medium text-gray-800">{survey.owner_name}</p>
                      </div>
                    )}
                    {survey.land_area_m2 && (
                      <div>
                        <span className="text-gray-500">Diện tích:</span>
                        <p className="font-medium text-gray-800">{survey.land_area_m2.toLocaleString('vi-VN')} m²</p>
                      </div>
                    )}
                  </div>

                  {survey.polygon_geometry && (
                    <div className="mt-2 flex items-center gap-1 text-blue-600 text-sm">
                      <Grid3X3 className="w-4 h-4" />
                      <span>Có dữ liệu ranh giới thửa đất</span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <button
                      className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/central/surveys/${survey.id}`, '_blank')
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Chi tiết
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Display polygon for selected survey */}
        {selectedSurvey && selectedSurvey.polygon_geometry && (
          <Polygon
            positions={getPolygonPositions(selectedSurvey.polygon_geometry)}
            pathOptions={{
              color: '#2563eb',
              weight: 3,
              fillColor: '#3b82f6',
              fillOpacity: 0.25,
              dashArray: '5, 5'
            }}
          />
        )}
      </MapContainer>

      {/* View Mode Toggle */}
      <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg z-[1000] p-1 flex gap-1">
        <button
          onClick={() => setViewMode('markers')}
          className={`p-2.5 rounded-lg transition-all ${viewMode === 'markers'
            ? 'bg-blue-500 text-white shadow-md'
            : 'hover:bg-gray-100 text-gray-600'
            }`}
          title="Chế độ điểm đánh dấu"
        >
          <MapPin className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode('heatmap')}
          className={`p-2.5 rounded-lg transition-all ${viewMode === 'heatmap'
            ? 'bg-orange-500 text-white shadow-md'
            : 'hover:bg-gray-100 text-gray-600'
            }`}
          title="Chế độ bản đồ nhiệt"
        >
          <Flame className="w-5 h-5" />
        </button>
        <button
          onClick={() => setViewMode('clusters')}
          className={`p-2.5 rounded-lg transition-all ${viewMode === 'clusters'
            ? 'bg-purple-500 text-white shadow-md'
            : 'hover:bg-gray-100 text-gray-600'
            }`}
          title="Chế độ nhóm"
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
      </div>

      {/* Survey Count Badge */}
      <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg z-[1000] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-semibold text-gray-800">{surveys.length}</span>
          <span className="text-gray-500 text-sm">vị trí</span>
        </div>
      </div>

      {/* Selected Survey Panel */}
      {selectedSurvey && (
        <div className="absolute bottom-4 left-4 right-20 max-w-md bg-white rounded-xl shadow-2xl z-[1000] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div
            className="h-2"
            style={{ backgroundColor: getStatusInfo(selectedSurvey.status).border }}
          />
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">
                  {selectedSurvey.location_name || 'Chưa đặt tên'}
                </h3>
                {selectedSurvey.address && (
                  <p className="text-sm text-gray-500 mt-1">{selectedSurvey.address}</p>
                )}
              </div>
              <button
                onClick={handleCloseSurveyPanel}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {selectedSurvey.owner_name && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <span className="text-xs text-gray-500 block">Chủ sở hữu</span>
                  <span className="font-medium text-gray-800">{selectedSurvey.owner_name}</span>
                </div>
              )}
              {selectedSurvey.land_area_m2 && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <span className="text-xs text-gray-500 block">Diện tích</span>
                  <span className="font-medium text-gray-800">{selectedSurvey.land_area_m2.toLocaleString('vi-VN')} m²</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: getStatusInfo(selectedSurvey.status).bg,
                  color: getStatusInfo(selectedSurvey.status).text,
                  border: `1px solid ${getStatusInfo(selectedSurvey.status).border}`
                }}
              >
                {getStatusInfo(selectedSurvey.status).label}
              </span>
              <a
                href={`/central/surveys/${selectedSurvey.id}`}
                className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Xem chi tiết
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Map Legend */}
      {showSurveys && (
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg z-[1000] min-w-[180px]">
          <h4 className="font-bold text-sm mb-3 text-gray-800 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Chú thích
          </h4>
          <div className="space-y-2">
            {Object.entries(STATUS_COLORS).filter(([key]) => key !== 'default').map(([status, colors]) => (
              <div key={status} className="flex items-center gap-2.5 group cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors">
                <div
                  className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white"
                  style={{ backgroundColor: colors.border }}
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{colors.label}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {surveys.filter(s => s.status === status).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
