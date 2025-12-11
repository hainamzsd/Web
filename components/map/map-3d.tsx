'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Database } from '@/lib/types/database'
import { X, MapPin, User, Ruler, Navigation, Calendar, ExternalLink, Search, ArrowRight, Building, Maximize2, RotateCcw, Layers, Mountain, Map, Satellite } from 'lucide-react'
import { LocationIdentifierData, getTrafficLightStatus } from './traffic-light-marker'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

const MAPTILER_API_KEY = 'sgYZRePFEIbHMYafIIRM'

// Map style options with different tile sources
type MapStyleKey = 'streets' | 'satellite' | 'hybrid' | 'topo'

const MAP_STYLES: Record<MapStyleKey, { name: string; icon: React.ReactNode; style: any }> = {
  streets: {
    name: 'Đường phố',
    icon: <Map className="h-4 w-4" />,
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© OpenStreetMap contributors'
        },
        'terrain': {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_API_KEY}`,
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ],
      terrain: {
        source: 'terrain',
        exaggeration: 1.5
      }
    }
  },
  satellite: {
    name: 'Vệ tinh',
    icon: <Satellite className="h-4 w-4" />,
    style: {
      version: 8,
      sources: {
        // Using ESRI World Imagery - higher resolution satellite
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© Esri, Maxar, Earthstar Geographics'
        },
        'terrain': {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_API_KEY}`,
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19
        }
      ],
      terrain: {
        source: 'terrain',
        exaggeration: 1.5
      }
    }
  },
  hybrid: {
    name: 'Kết hợp',
    icon: <Layers className="h-4 w-4" />,
    style: {
      version: 8,
      sources: {
        // ESRI satellite as base
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© Esri, Maxar, Earthstar Geographics'
        },
        // CartoDB labels overlay (transparent background with labels)
        'carto-labels': {
          type: 'raster',
          tiles: [
            'https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png',
            'https://cartodb-basemaps-b.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© CARTO'
        },
        'terrain': {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_API_KEY}`,
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19
        },
        {
          id: 'labels-layer',
          type: 'raster',
          source: 'carto-labels',
          minzoom: 0,
          maxzoom: 19
        }
      ],
      terrain: {
        source: 'terrain',
        exaggeration: 1.5
      }
    }
  },
  topo: {
    name: 'Địa hình',
    icon: <Mountain className="h-4 w-4" />,
    style: {
      version: 8,
      sources: {
        // OpenTopoMap - detailed topographic map
        'opentopomap': {
          type: 'raster',
          tiles: [
            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          maxzoom: 17,
          attribution: '© OpenTopoMap (CC-BY-SA)'
        },
        'terrain': {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_API_KEY}`,
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'topo-layer',
          type: 'raster',
          source: 'opentopomap',
          minzoom: 0,
          maxzoom: 17
        }
      ],
      terrain: {
        source: 'terrain',
        exaggeration: 1.5
      }
    }
  }
}

interface Map3DProps {
  surveys: SurveyLocation[]
  center?: [number, number]
  zoom?: number
  height?: string
  showSearch?: boolean
  baseDetailUrl?: string
  locationIdentifiers?: Record<string, LocationIdentifierData>
  onSurveySelect?: (survey: SurveyLocation | null) => void
}

export function Map3D({
  surveys,
  center = [108.0, 16.0], // MapLibre uses [lng, lat]
  zoom = 6,
  height = '600px',
  showSearch = true,
  baseDetailUrl = '/commune/surveys',
  locationIdentifiers = {},
  onSurveySelect
}: Map3DProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SurveyLocation[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [pitch, setPitch] = useState(60)
  const [bearing, setBearing] = useState(0)
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>('hybrid')
  const [showStyleMenu, setShowStyleMenu] = useState(false)

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
    if (map.current && survey.latitude && survey.longitude) {
      map.current.flyTo({
        center: [survey.longitude, survey.latitude],
        zoom: 17,
        pitch: 60,
        duration: 2000
      })
    }
    if (onSurveySelect) {
      onSurveySelect(survey)
    }
  }

  // Change map style
  const changeStyle = (styleKey: MapStyleKey) => {
    if (!map.current) return

    const styleConfig = MAP_STYLES[styleKey]
    map.current.setStyle(styleConfig.style)
    setCurrentStyle(styleKey)
    setShowStyleMenu(false)

    // Re-enable terrain and sky after style change
    map.current.once('style.load', () => {
      if (map.current?.getSource('terrain')) {
        map.current.setTerrain({
          source: 'terrain',
          exaggeration: 1.5
        })
      }

      // Add sky layer
      if (!map.current?.getLayer('sky')) {

      }
    })
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const styleConfig = MAP_STYLES[currentStyle]

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: styleConfig.style,
      center: center,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      maxPitch: 85
    })

    mapInstance.on('load', () => {
      // Enable terrain if source exists
      if (mapInstance.getSource('terrain')) {
        mapInstance.setTerrain({
          source: 'terrain',
          exaggeration: 1.5
        })
      }

      // Add sky layer for better 3D effect


      setIsMapReady(true)
    })

    // Add navigation controls
    mapInstance.addControl(new maplibregl.NavigationControl({
      visualizePitch: true
    }), 'bottom-right')

    // Add fullscreen control
    mapInstance.addControl(new maplibregl.FullscreenControl(), 'bottom-right')

    // Track pitch and bearing changes
    mapInstance.on('pitchend', () => {
      setPitch(mapInstance.getPitch())
    })

    mapInstance.on('rotateend', () => {
      setBearing(mapInstance.getBearing())
    })

    map.current = mapInstance

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Add markers when map is ready
  useEffect(() => {
    if (!map.current || !isMapReady) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    const validSurveys = surveys.filter(s => s.latitude && s.longitude)

    validSurveys.forEach(survey => {
      const hasLocationId = locationIdentifiers[survey.id]
      const locationIdData = locationIdentifiers[survey.id]

      // Determine marker color based on status or location identifier
      let markerColor = '#f59e0b' // default amber
      let glowColor = 'rgba(245, 158, 11, 0.4)'

      if (hasLocationId) {
        const isActive = locationIdData.is_active
        markerColor = isActive ? '#22c55e' : '#ef4444'
        glowColor = isActive ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      } else {
        switch (survey.status) {
          case 'approved_province':
            markerColor = '#10b981'
            glowColor = 'rgba(16, 185, 129, 0.4)'
            break
          case 'approved_central':
            markerColor = '#3b82f6'
            glowColor = 'rgba(59, 130, 246, 0.4)'
            break
          case 'approved_commune':
            markerColor = '#8b5cf6'
            glowColor = 'rgba(139, 92, 246, 0.4)'
            break
          case 'reviewed':
            markerColor = '#0ea5e9'
            glowColor = 'rgba(14, 165, 233, 0.4)'
            break
          case 'rejected':
            markerColor = '#ef4444'
            glowColor = 'rgba(239, 68, 68, 0.4)'
            break
        }
      }

      // Create custom marker element
      const el = document.createElement('div')
      el.className = 'marker-3d'
      el.innerHTML = `
        <div style="
          position: relative;
          cursor: pointer;
          transform-style: preserve-3d;
        ">
          <div style="
            width: 24px;
            height: 24px;
            background: ${markerColor};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px ${glowColor}, 0 0 20px ${glowColor};
            transition: all 0.3s ease;
          "></div>
          ${hasLocationId ? `
            <div style="
              position: absolute;
              top: -24px;
              left: 50%;
              transform: translateX(-50%);
              background: white;
              color: ${markerColor};
              font-size: 10px;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              font-family: monospace;
            ">${locationIdData.location_id}</div>
          ` : ''}
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 12px solid ${markerColor};
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          "></div>
        </div>
      `

      // Add hover effect
      el.addEventListener('mouseenter', () => {
        const inner = el.querySelector('div > div:first-child') as HTMLElement
        if (inner) {
          inner.style.transform = 'scale(1.2)'
          inner.style.boxShadow = `0 6px 20px ${glowColor}, 0 0 30px ${glowColor}`
        }
      })

      el.addEventListener('mouseleave', () => {
        const inner = el.querySelector('div > div:first-child') as HTMLElement
        if (inner) {
          inner.style.transform = 'scale(1)'
          inner.style.boxShadow = `0 4px 12px ${glowColor}, 0 0 20px ${glowColor}`
        }
      })

      el.addEventListener('click', () => {
        setSelectedSurvey(survey)
        if (onSurveySelect) {
          onSurveySelect(survey)
        }
        if (map.current) {
          map.current.flyTo({
            center: [survey.longitude!, survey.latitude!],
            zoom: 17,
            pitch: 60,
            duration: 1500
          })
        }
      })

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([survey.longitude!, survey.latitude!])
        .addTo(map.current!)

      markersRef.current.push(marker)
    })

    // Fit bounds to show all markers
    if (validSurveys.length > 0 && !selectedSurvey) {
      const bounds = new maplibregl.LngLatBounds()
      validSurveys.forEach(s => {
        bounds.extend([s.longitude!, s.latitude!])
      })
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        pitch: 60
      })
    }
  }, [surveys, isMapReady, locationIdentifiers])

  const resetView = () => {
    if (map.current) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        pitch: 60,
        bearing: 0,
        duration: 2000
      })
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      reviewed: 'Đã xem xét',
      approved_commune: 'Đã duyệt (Xã)',
      approved_province: 'Đã duyệt (Tỉnh)',
      approved_central: 'Đã duyệt (TW)',
      rejected: 'Từ chối'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      reviewed: 'bg-sky-100 text-sky-700',
      approved_commune: 'bg-purple-100 text-purple-700',
      approved_province: 'bg-green-100 text-green-700',
      approved_central: 'bg-blue-100 text-blue-700',
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
                        <div className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ${survey.status === 'approved_central' ? 'bg-blue-500' :
                          survey.status === 'approved_province' ? 'bg-green-500' :
                            survey.status === 'approved_commune' ? 'bg-purple-500' :
                              survey.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
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

      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* 3D Controls */}
      <div className="absolute top-3 right-3 z-[10] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 space-y-2">
        <div className="text-xs font-medium text-gray-600 px-2">Chế độ 3D</div>

        {/* Style Selector */}
        <div className="relative">
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="w-full px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-between gap-2 transition-colors"
          >
            <span className="flex items-center gap-2">
              {MAP_STYLES[currentStyle].icon}
              {MAP_STYLES[currentStyle].name}
            </span>
            <svg className={`w-4 h-4 transition-transform ${showStyleMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showStyleMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20">
              {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((styleKey) => (
                <button
                  key={styleKey}
                  onClick={() => changeStyle(styleKey)}
                  className={`w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors ${currentStyle === styleKey
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {MAP_STYLES[styleKey].icon}
                  {MAP_STYLES[styleKey].name}
                  {currentStyle === styleKey && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 my-1"></div>

        <div className="text-xs text-gray-500 px-2">
          Góc nghiêng: {Math.round(pitch)}°
        </div>
        <div className="text-xs text-gray-500 px-2">
          Xoay: {Math.round(bearing)}°
        </div>
        <button
          onClick={resetView}
          className="w-full px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Đặt lại góc nhìn
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-24 right-3 z-[10] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <h4 className="font-semibold text-sm mb-2">Trạng thái</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"></div>
            <span>Có mã - Hoạt động</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></div>
            <span>Có mã - Vô hiệu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Chờ xử lý</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Đã duyệt TW</span>
          </div>
        </div>
      </div>

      {/* Info Card */}
      {selectedSurvey && (
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
              <div className={`flex items-center gap-2 p-2 rounded-lg ${locationIdentifiers[selectedSurvey.id].is_active
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
                }`}>
                <div className={`w-3 h-3 rounded-full ${locationIdentifiers[selectedSurvey.id].is_active ? 'bg-green-500' : 'bg-red-500'
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
