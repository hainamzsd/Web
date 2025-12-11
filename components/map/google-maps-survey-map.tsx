'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polygon } from '@react-google-maps/api'
import { Database } from '@/lib/types/database'
import {
  GOOGLE_MAPS_API_KEY,
  MAP_CONFIG,
  GOOGLE_MAPS_LIBRARIES,
  DEFAULT_MAP_OPTIONS,
  POLYGON_STYLES
} from '@/lib/map/google-maps-config'
import { LocationIdentifierData } from './traffic-light-marker'
import {
  X, MapPin, User, Ruler, Navigation, Calendar, ExternalLink,
  Search, ArrowRight, Tag, Building, TrafficCone, Loader2
} from 'lucide-react'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

interface GoogleMapsSurveyMapProps {
  surveys: SurveyLocation[]
  center?: { lat: number; lng: number }
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

const containerStyle = {
  width: '100%',
  height: '100%'
}

export function GoogleMapsSurveyMap({
  surveys,
  center,
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
}: GoogleMapsSurveyMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyLocation | null>(null)
  const [activeMarker, setActiveMarker] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SurveyLocation[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [mapMode, setMapMode] = useState<'markers' | 'trafficLights'>('markers')

  const mapCenter = center || MAP_CONFIG.DEFAULT_CENTER

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)

    // Fit bounds to show all surveys
    if (surveys.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      surveys.forEach(survey => {
        if (survey.latitude && survey.longitude) {
          bounds.extend({ lat: survey.latitude, lng: survey.longitude })
        }
      })
      map.fitBounds(bounds, 50)
    }
  }, [surveys])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Search function
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    const query = searchQuery.toLowerCase().trim()

    const results = surveys.filter(survey => {
      if (survey.location_identifier?.toLowerCase().includes(query)) return true
      if (survey.location_name?.toLowerCase().includes(query)) return true
      if (survey.address?.toLowerCase().includes(query)) return true
      if (survey.representative_name?.toLowerCase().includes(query)) return true
      return false
    })

    setSearchResults(results.slice(0, 10))
    setShowSearchResults(true)
    setIsSearching(false)
  }, [searchQuery, surveys])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const goToSurvey = (survey: SurveyLocation) => {
    setSelectedSurvey(survey)
    setShowSearchResults(false)
    if (map && survey.latitude && survey.longitude) {
      map.panTo({ lat: survey.latitude, lng: survey.longitude })
      map.setZoom(17)
    }
    if (onSurveySelect) {
      onSurveySelect(survey)
    }
  }

  const getMarkerColor = (status: string): string => {
    return MAP_CONFIG.MARKER_COLORS[status] || '#6b7280'
  }

  const getMarkerIcon = (survey: SurveyLocation) => {
    const hasLocationId = locationIdentifiers[survey.id]
    const locationIdData = locationIdentifiers[survey.id]

    let color = getMarkerColor(survey.status)

    if (hasLocationId) {
      color = locationIdData.is_active ? '#22c55e' : '#ef4444'
    }

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
      scale: selectedSurveyId === survey.id ? 12 : 10,
    }
  }

  const parsePolygonGeometry = (geometry: any): google.maps.LatLngLiteral[] => {
    if (!geometry) return []

    try {
      if (typeof geometry === 'object' && geometry !== null) {
        if (geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
          return geometry.coordinates[0].map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }))
        }
      }

      if (Array.isArray(geometry)) {
        return geometry.map((point: any) => {
          if (Array.isArray(point) && point.length >= 2) {
            return { lat: point[0], lng: point[1] }
          }
          if (typeof point === 'object' && point !== null) {
            return {
              lat: point.lat || point.latitude || 0,
              lng: point.lng || point.longitude || 0
            }
          }
          return { lat: 0, lng: 0 }
        })
      }
    } catch (e) {
      console.error('Error parsing polygon geometry:', e)
    }

    return []
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      reviewed: 'Đã xem xét',
      approved_commune: 'Đã duyệt (Xã)',
      approved_central: 'Đã duyệt (TW)',
      published: 'Đã công bố',
      rejected: 'Từ chối'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      reviewed: 'bg-sky-100 text-sky-700',
      approved_commune: 'bg-purple-100 text-purple-700',
      approved_central: 'bg-blue-100 text-blue-700',
      published: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50">
        <div className="text-center text-red-600">
          <p className="font-medium">Lỗi tải Google Maps</p>
          <p className="text-sm">{loadError.message}</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Đang tải Google Maps...</p>
        </div>
      </div>
    )
  }

  const validSurveys = surveys.filter(s => s.latitude && s.longitude)

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[10] w-full max-w-md px-4">
          <div className="relative">
            <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="pl-4 pr-2">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Tìm theo mã định danh, tên, địa chỉ..."
                className="flex-1 py-3 px-2 text-sm focus:outline-none bg-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                {isSearching ? 'Đang tìm...' : 'Tìm'}
              </button>
            </div>

            {/* Search Results */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Không tìm thấy kết quả</p>
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                      Tìm thấy {searchResults.length} kết quả
                    </div>
                    {searchResults.map((survey) => (
                      <button
                        key={survey.id}
                        onClick={() => goToSurvey(survey)}
                        className="w-full px-4 py-3 hover:bg-blue-50 flex items-start gap-3 border-b border-gray-100 last:border-0 transition-colors text-left"
                      >
                        <div
                          className="mt-0.5 w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getMarkerColor(survey.status) }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-gray-900 truncate block">
                            {survey.location_name || 'Chưa đặt tên'}
                          </span>
                          <p className="text-xs text-gray-500 truncate">
                            {survey.address || 'Chưa có địa chỉ'}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowSearchResults(false)}
                  className="w-full py-2 text-xs text-gray-500 hover:bg-gray-50 border-t"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          ...DEFAULT_MAP_OPTIONS,
          mapTypeId: 'roadmap',
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
          }
        }}
      >
        {/* Markers */}
        {validSurveys.map((survey) => (
          <Marker
            key={survey.id}
            position={{ lat: survey.latitude!, lng: survey.longitude! }}
            icon={getMarkerIcon(survey)}
            onClick={() => {
              setSelectedSurvey(survey)
              setActiveMarker(survey.id)
              if (onSurveySelect) {
                onSurveySelect(survey)
              }
            }}
          />
        ))}

        {/* Info Window */}
        {activeMarker && selectedSurvey && (
          <InfoWindow
            position={{ lat: selectedSurvey.latitude!, lng: selectedSurvey.longitude! }}
            onCloseClick={() => {
              setActiveMarker(null)
            }}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">
                {selectedSurvey.location_name || 'Chưa đặt tên'}
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                {selectedSurvey.address || 'Chưa có địa chỉ'}
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedSurvey.status)}`}>
                  {getStatusLabel(selectedSurvey.status)}
                </span>
              </div>
              <a
                href={`${baseDetailUrl}/${selectedSurvey.id}`}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Xem chi tiết <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </InfoWindow>
        )}

        {/* Polygon for selected survey */}
        {selectedSurvey && selectedSurvey.polygon_geometry && (
          <Polygon
            paths={parsePolygonGeometry(selectedSurvey.polygon_geometry)}
            options={POLYGON_STYLES.selected}
          />
        )}
      </GoogleMap>

      {/* Map Controls */}
      <div className="absolute top-3 right-14 z-[10] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 space-y-2">
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
          onClick={() => setMapMode('trafficLights')}
          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mapMode === 'trafficLights'
            ? 'bg-gradient-to-r from-red-500 to-green-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <TrafficCone className="h-4 w-4" />
          Mã định danh
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-24 right-3 z-[10] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <h4 className="font-semibold text-sm mb-2">Trạng thái</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <span>Chờ xử lý</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
            <span>Đã xem xét</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span>Đã duyệt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span>Từ chối</span>
          </div>
        </div>
      </div>

      {/* Info Card */}
      {showInfoCard && selectedSurvey && (
        <div className="absolute top-3 left-3 z-[10] bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 w-80 max-h-[calc(100%-24px)] overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {selectedSurvey.location_identifier && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono mb-1 inline-block">
                    {selectedSurvey.location_identifier}
                  </span>
                )}
                <h3 className="font-semibold text-sm truncate">
                  {selectedSurvey.location_name || 'Chưa đặt tên'}
                </h3>
                <p className="text-blue-100 text-xs mt-0.5 truncate">
                  {selectedSurvey.address || 'Chưa có địa chỉ'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSurvey(null)}
                className="ml-2 p-1.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Trạng thái</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(selectedSurvey.status)}`}>
                {getStatusLabel(selectedSurvey.status)}
              </span>
            </div>

            {locationIdentifiers[selectedSurvey.id] && (
              <div className={`flex items-center gap-2 p-2 rounded-lg ${
                locationIdentifiers[selectedSurvey.id].is_active
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  locationIdentifiers[selectedSurvey.id].is_active ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <span className="text-xs font-medium">
                    Mã: {locationIdentifiers[selectedSurvey.id].location_id}
                  </span>
                  <p className="text-xs">
                    {locationIdentifiers[selectedSurvey.id].is_active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {selectedSurvey.representative_name && (
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Chủ sở hữu</p>
                    <p className="text-sm font-medium truncate">{selectedSurvey.representative_name}</p>
                  </div>
                </div>
              )}

              {selectedSurvey.land_area_m2 && (
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <Ruler className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Diện tích</p>
                    <p className="text-sm font-medium">{selectedSurvey.land_area_m2.toLocaleString('vi-VN')} m²</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <Navigation className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Tọa độ GPS</p>
                  <p className="text-xs font-mono text-gray-700">
                    {selectedSurvey.latitude?.toFixed(6)}, {selectedSurvey.longitude?.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>

            {selectedSurvey.polygon_geometry && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-blue-700">
                <Tag className="h-4 w-4" />
                <span className="text-xs font-medium">Có dữ liệu ranh giới polygon</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Ngày tạo: {formatDate(selectedSurvey.created_at)}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href={`${baseDetailUrl}/${selectedSurvey.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Xem chi tiết
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GoogleMapsSurveyMap
