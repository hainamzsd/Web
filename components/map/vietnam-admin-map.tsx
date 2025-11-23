'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { VIETNAM_BOUNDS } from '@/lib/map/vietnam-administrative-data'

interface VietnamAdminMapProps {
  selectedProvince?: string
  selectedDistrict?: string
  selectedCommune?: string
  onProvinceSelect?: (code: string) => void
  onDistrictSelect?: (code: string) => void
  onCommuneSelect?: (code: string) => void
  showSurveys?: boolean
  surveys?: Array<{
    id: string
    latitude: number
    longitude: number
    location_name: string
    status: string
  }>
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
  selectedProvince,
  selectedDistrict,
  onProvinceSelect,
  showSurveys = true,
  surveys = []
}: VietnamAdminMapProps) {
  const [provinces, setProvinces] = useState<GeoJSON.FeatureCollection | null>(null)
  const [districts] = useState<GeoJSON.FeatureCollection | null>(null)
  const [communes] = useState<GeoJSON.FeatureCollection | null>(null)
  const [mapBounds] = useState<[[number, number], [number, number]]>(VIETNAM_BOUNDS)

  // Load GeoJSON boundaries (in production, these would come from a server)
  useEffect(() => {
    // For now, we'll use simplified boundaries
    // In production, load from: /api/boundaries/provinces.geojson

    // Simplified Vietnam provinces GeoJSON structure
    const simplifiedProvinces: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature',
          properties: {
            code: '01',
            name: 'Hà Nội',
            region: 'north'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [105.3, 20.5],
              [106.0, 20.5],
              [106.0, 21.4],
              [105.3, 21.4],
              [105.3, 20.5]
            ]]
          }
        },
        {
          type: 'Feature',
          properties: {
            code: '79',
            name: 'TP. Hồ Chí Minh',
            region: 'south'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [106.3, 10.3],
              [107.0, 10.3],
              [107.0, 11.2],
              [106.3, 11.2],
              [106.3, 10.3]
            ]]
          }
        },
        {
          type: 'Feature',
          properties: {
            code: '48',
            name: 'Đà Nẵng',
            region: 'central'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [107.9, 15.9],
              [108.3, 15.9],
              [108.3, 16.2],
              [107.9, 16.2],
              [107.9, 15.9]
            ]]
          }
        }
      ]
    }

    setProvinces(simplifiedProvinces)
  }, [])

  // Province style
  const provinceStyle = (feature?: GeoJSON.Feature) => {
    const isSelected = feature?.properties?.code === selectedProvince
    return {
      fillColor: isSelected ? '#3b82f6' : getRegionColor(feature?.properties?.region || 'north'),
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#1e40af' : '#666',
      fillOpacity: isSelected ? 0.5 : 0.2
    }
  }

  const getRegionColor = (region: string) => {
    switch (region) {
      case 'north': return '#10b981'
      case 'central': return '#f59e0b'
      case 'south': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Handle province click
  const onEachProvince = (feature: GeoJSON.Feature, layer: L.Layer) => {
    layer.on({
      click: () => {
        if (onProvinceSelect && feature.properties?.code) {
          onProvinceSelect(feature.properties.code)
        }
      },
      mouseover: (e: L.LeafletMouseEvent) => {
        const eventLayer = e.target as L.Path
        eventLayer.setStyle({
          weight: 3,
          fillOpacity: 0.4
        })
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const eventLayer = e.target as L.Path
        eventLayer.setStyle(provinceStyle(feature))
      }
    })

    layer.bindPopup(`
      <div class="p-2">
        <h3 class="font-bold">${feature.properties?.name || 'Unknown'}</h3>
        <p class="text-sm text-gray-600">Mã: ${feature.properties?.code || 'N/A'}</p>
        <p class="text-sm text-gray-600">Vùng: ${feature.properties?.region || 'N/A'}</p>
      </div>
    `)
  }

  // Survey marker style
  const getMarkerIcon = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#FCD34D',
      reviewed: '#60A5FA',
      approved_commune: '#34D399',
      approved_central: '#10B981',
      rejected: '#EF4444',
      published: '#8B5CF6'
    }

    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${colors[status] || '#6B7280'}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
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

        {/* Province boundaries */}
        {provinces && (
          <GeoJSON
            data={provinces}
            style={provinceStyle}
            onEachFeature={onEachProvince}
          />
        )}

        {/* District boundaries */}
        {districts && selectedProvince && (
          <GeoJSON
            data={districts}
            style={() => ({
              fillColor: '#60a5fa',
              weight: 2,
              opacity: 1,
              color: '#2563eb',
              fillOpacity: 0.3
            })}
          />
        )}

        {/* Commune boundaries */}
        {communes && selectedDistrict && (
          <GeoJSON
            data={communes}
            style={() => ({
              fillColor: '#34d399',
              weight: 1,
              opacity: 1,
              color: '#059669',
              fillOpacity: 0.2
            })}
          />
        )}

        {/* Survey markers */}
        {showSurveys && surveys.map((survey) => (
          <Marker
            key={survey.id}
            position={[survey.latitude, survey.longitude]}
            icon={getMarkerIcon(survey.status)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{survey.location_name}</h3>
                <p className="text-xs text-gray-600">Status: {survey.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg z-[1000]">
        <h4 className="font-bold text-sm mb-2">Vùng miền</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
            <span>Miền Bắc</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Miền Trung</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span>Miền Nam</span>
          </div>
        </div>

        {showSurveys && (
          <>
            <h4 className="font-bold text-sm mt-3 mb-2">Trạng thái khảo sát</h4>
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
          </>
        )}
      </div>
    </div>
  )
}
