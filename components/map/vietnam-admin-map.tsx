'use client'

import { useEffect, useState, useId } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet'
import type { DivIcon, LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { VIETNAM_BOUNDS } from '@/lib/map/vietnam-administrative-data'
import { Json } from '@/lib/types/database'

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

// Map bounds controller
function MapBoundsController({ bounds }: { bounds: [[number, number], [number, number]] }) {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(bounds)
  }, [map, bounds])

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
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyData | null>(null)

  useEffect(() => {
    setIsClient(true)

    // Small delay to ensure DOM is ready before mounting map
    const timer = setTimeout(() => {
      setMapReady(true)
    }, 100)

    // Initialize marker icons on client side
    const initIcons = async () => {
      const L = await import('leaflet')
      const colors: Record<string, string> = {
        pending: '#FCD34D',
        reviewed: '#60A5FA',
        approved_commune: '#34D399',
        approved_central: '#10B981',
        rejected: '#EF4444',
        published: '#8B5CF6'
      }

      const icons: Record<string, DivIcon> = {}
      Object.entries(colors).forEach(([status, color]) => {
        icons[status] = L.default.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      })
      icons['default'] = L.default.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #6B7280; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
      setMarkerIcons(icons)
    }
    initIcons()

    return () => {
      clearTimeout(timer)
      setMapReady(false)
    }
  }, [])

  const getMarkerIcon = (status: string) => {
    return markerIcons[status] || markerIcons['default']
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

  const handleSurveyClick = (survey: SurveyData) => {
    setSelectedSurvey(survey)
    if (onSurveySelect) {
      onSurveySelect(survey)
    }
  }

  if (!isClient || !mapReady) {
    return <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <p className="text-gray-500">Đang tải bản đồ...</p>
    </div>
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        key={`vietnam-admin-map-${mapId}`}
        bounds={mapBounds}
        zoom={6}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapBoundsController bounds={mapBounds} />

        {/* Survey markers */}
        {showSurveys && Object.keys(markerIcons).length > 0 && surveys.map((survey) => (
          <Marker
            key={survey.id}
            position={[survey.latitude, survey.longitude]}
            icon={getMarkerIcon(survey.status)}
            eventHandlers={{
              click: () => handleSurveyClick(survey)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-sm text-gray-900">{survey.location_name || 'Chưa đặt tên'}</h3>
                {survey.address && (
                  <p className="text-xs text-gray-600 mt-1">{survey.address}</p>
                )}
                {survey.owner_name && (
                  <p className="text-xs text-gray-600">Chủ sở hữu: {survey.owner_name}</p>
                )}
                {survey.land_area_m2 && (
                  <p className="text-xs text-gray-600">Diện tích: {survey.land_area_m2.toLocaleString('vi-VN')} m²</p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    survey.status === 'pending' ? 'bg-yellow-400' :
                    survey.status === 'reviewed' ? 'bg-blue-400' :
                    survey.status === 'approved_commune' ? 'bg-emerald-400' :
                    survey.status === 'approved_central' ? 'bg-green-500' :
                    survey.status === 'rejected' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></span>
                  <span className="text-xs text-gray-500">
                    {survey.status === 'pending' ? 'Chờ xử lý' :
                     survey.status === 'reviewed' ? 'Đã xem xét' :
                     survey.status === 'approved_commune' ? 'Xã đã duyệt' :
                     survey.status === 'approved_central' ? 'TW đã duyệt' :
                     survey.status === 'rejected' ? 'Đã từ chối' :
                     survey.status}
                  </span>
                </div>
                {survey.polygon_geometry && (
                  <p className="text-xs text-blue-600 mt-1">📐 Có dữ liệu ranh giới</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Display polygon for selected survey */}
        {selectedSurvey && selectedSurvey.polygon_geometry && (
          <Polygon
            positions={getPolygonPositions(selectedSurvey.polygon_geometry)}
            pathOptions={{
              color: '#3b82f6',
              weight: 3,
              fillColor: '#3b82f6',
              fillOpacity: 0.2
            }}
          />
        )}
      </MapContainer>

      {/* Map Legend */}
      {showSurveys && (
        <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
          <h4 className="font-bold text-sm mb-2">Trạng thái khảo sát</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FCD34D' }}></div>
              <span>Chờ xử lý</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#60A5FA' }}></div>
              <span>Đã xem xét</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#34D399' }}></div>
              <span>Xã đã duyệt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
              <span>TW đã duyệt</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
