'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Database } from '@/lib/types/database'
import { EntryPoint } from '@/lib/types/entry-points'
import {
  X, MapPin, User, Ruler, Navigation, Calendar, ExternalLink,
  Search, ArrowRight, Tag, Building, TrafficCone, Layers, Map as MapIcon, Satellite
} from 'lucide-react'
import {
  VIETMAP_API_KEY,
  VIETMAP_DEFAULT_CONFIG,
  getMarkerColor,
  getStatusLabel,
  getStatusBadgeColor,
  getVietmapRasterStyle,
  getVietmapDarkStyle,
  getVietmapLightStyle
} from '@/lib/map/vietmap-config'
import { LocationIdentifierData, getTrafficLightStatus } from './traffic-light-marker'

// Declare vietmapgl on window for CDN loaded script
declare global {
  interface Window {
    vietmapgl: any
  }
}

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

type MapStyleKey = 'default' | 'light' | 'dark'

const STYLE_OPTIONS: Record<MapStyleKey, { name: string; icon: React.ReactNode }> = {
  default: { name: 'Mặc định', icon: <MapIcon className="h-4 w-4" /> },
  light: { name: 'Sáng', icon: <Layers className="h-4 w-4" /> },
  dark: { name: 'Tối', icon: <Satellite className="h-4 w-4" /> }
}

interface VietmapSurveyMapProps {
  surveys: SurveyLocation[]
  center?: [number, number]
  zoom?: number
  showHeatmap?: boolean
  showClustering?: boolean
  enableDrawing?: boolean
  onPolygonDrawn?: (polygon: any) => void
  selectedSurveyId?: string | null
  onSurveySelect?: (survey: SurveyLocation | null) => void
  entryPoints?: EntryPoint[]
  showInfoCard?: boolean
  height?: string
  showSearch?: boolean
  baseDetailUrl?: string
  locationIdentifiers?: Record<string, LocationIdentifierData>
}

export function VietmapSurveyMap({
  surveys,
  center = [16.0, 108.0], // [lat, lng] for compatibility
  zoom = 6,
  showHeatmap = false,
  showClustering = false,
  enableDrawing = false,
  onPolygonDrawn,
  selectedSurveyId,
  onSurveySelect,
  entryPoints = [],
  showInfoCard = true,
  height = '600px',
  showSearch = true,
  baseDetailUrl = '/commune/surveys',
  locationIdentifiers = {}
}: VietmapSurveyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polygonLayerRef = useRef<string | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [vietmapgl, setVietmapgl] = useState<any>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SurveyLocation[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap' | 'clusters' | 'trafficLights'>('markers')
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>('default')
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
      if (survey.owner_name?.toLowerCase().includes(query)) return true
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
        duration: 1500
      })
    }
    if (onSurveySelect) {
      onSurveySelect(survey)
    }
  }

  // Parse polygon geometry
  const parsePolygonGeometry = (geometry: any): [number, number][][] => {
    if (!geometry) return []

    try {
      if (typeof geometry === 'object' && geometry !== null) {
        if (geometry.type === 'Polygon' && geometry.coordinates) {
          return geometry.coordinates
        }
      }

      if (Array.isArray(geometry)) {
        // Convert [lat, lng] to [lng, lat] for Vietmap GL
        const converted = geometry.map((point: any) => {
          if (Array.isArray(point) && point.length >= 2) {
            return [point[1], point[0]] // [lng, lat]
          }
          if (typeof point === 'object' && point !== null) {
            return [point.lng || point.longitude || 0, point.lat || point.latitude || 0]
          }
          return [0, 0]
        })
        return [converted]
      }
    } catch (e) {
      console.error('Error parsing polygon geometry:', e)
    }

    return []
  }

  // Change map style
  const changeStyle = (styleKey: MapStyleKey) => {
    if (!map.current) return

    // Get the appropriate style based on selection
    let style
    switch (styleKey) {
      case 'dark':
        style = getVietmapDarkStyle()
        break
      case 'light':
        style = getVietmapLightStyle()
        break
      default:
        style = getVietmapRasterStyle() // Voyager style
    }

    map.current.setStyle(style)
    setCurrentStyle(styleKey)
    setShowStyleMenu(false)

    // Re-add markers after style change
    map.current.once('style.load', () => {
      updateMarkers()
    })
  }

  // Update markers on the map
  const updateMarkers = useCallback(() => {
    if (!map.current || !vietmapgl || !isMapReady) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    const validSurveys = surveys.filter(s => s.latitude && s.longitude)
    if (validSurveys.length === 0) return

    validSurveys.forEach(survey => {
      const hasLocationId = locationIdentifiers[survey.id]
      const locationIdData = locationIdentifiers[survey.id]

      // Determine marker color
      let markerColor = getMarkerColor(survey.status)
      let glowColor = markerColor + '66' // Add alpha

      if (hasLocationId) {
        const isActive = locationIdData.is_active
        markerColor = isActive ? '#22c55e' : '#ef4444'
        glowColor = isActive ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      }

      // Create marker element
      const el = document.createElement('div')
      el.className = 'vietmap-marker'
      el.style.cursor = 'pointer'

      if (mapMode === 'trafficLights' && hasLocationId) {
        // Traffic light style marker
        const isActive = locationIdData.is_active
        el.innerHTML = `
          <div style="position: relative; transform-style: preserve-3d;">
            <div style="
              width: 32px;
              height: 32px;
              background: ${isActive ? '#22c55e' : '#ef4444'};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 15px ${isActive ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'};
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
                animation: pulse 2s infinite;
              "></div>
            </div>
            <div style="
              position: absolute;
              top: -22px;
              left: 50%;
              transform: translateX(-50%);
              background: white;
              color: ${isActive ? '#22c55e' : '#ef4444'};
              font-size: 9px;
              font-weight: bold;
              padding: 2px 6px;
              border-radius: 4px;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              font-family: monospace;
            ">${locationIdData.location_id}</div>
            <div style="
              position: absolute;
              bottom: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 10px solid ${isActive ? '#22c55e' : '#ef4444'};
            "></div>
          </div>
        `
      } else {
        // Standard marker
        const isSelected = selectedSurveyId === survey.id
        el.innerHTML = `
          <div style="
            position: relative;
            cursor: pointer;
          ">
            <div style="
              width: ${isSelected ? '28px' : '22px'};
              height: ${isSelected ? '28px' : '22px'};
              background: ${markerColor};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px ${glowColor};
              transition: all 0.2s ease;
            "></div>
            ${hasLocationId ? `
              <div style="
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                color: ${markerColor};
                font-size: 9px;
                font-weight: bold;
                padding: 2px 5px;
                border-radius: 3px;
                white-space: nowrap;
                box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                font-family: monospace;
              ">${locationIdData?.location_id}</div>
            ` : ''}
            <div style="
              position: absolute;
              bottom: -5px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 8px solid ${markerColor};
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
            "></div>
          </div>
        `
      }

      // Add hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.15)'
        el.style.zIndex = '100'
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)'
        el.style.zIndex = '1'
      })

      // Click handler
      el.addEventListener('click', () => {
        setSelectedSurvey(survey)
        if (onSurveySelect) {
          onSurveySelect(survey)
        }
        if (map.current) {
          map.current.flyTo({
            center: [survey.longitude!, survey.latitude!],
            zoom: 17,
            duration: 1200
          })
        }
      })

      // Create and add marker
      const marker = new vietmapgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([survey.longitude!, survey.latitude!])
        .addTo(map.current)

      markersRef.current.push(marker)
    })

    // Fit bounds to show all markers
    if (validSurveys.length > 0 && !selectedSurvey) {
      const bounds = new vietmapgl.LngLatBounds()
      validSurveys.forEach(s => {
        bounds.extend([s.longitude!, s.latitude!])
      })
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      })
    }
  }, [surveys, mapMode, selectedSurveyId, locationIdentifiers, vietmapgl, isMapReady, onSurveySelect, selectedSurvey])

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainer.current || map.current) return

    let mounted = true

    const initMap = async () => {
      // Load Vietmap GL JS from CDN if not already loaded
      if (!window.vietmapgl) {
        // Load CSS
        const linkElement = document.createElement('link')
        linkElement.rel = 'stylesheet'
        linkElement.href = 'https://unpkg.com/@vietmap/vietmap-gl-js@6.0.0/dist/vietmap-gl.css'
        if (!document.head.querySelector('link[href*="vietmap-gl.css"]')) {
          document.head.appendChild(linkElement)
        }

        // Load JS
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://unpkg.com/@vietmap/vietmap-gl-js@6.0.0/dist/vietmap-gl.js'
          script.async = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Vietmap GL JS'))
          document.head.appendChild(script)
        })
      }

      if (!mounted || !window.vietmapgl) return

      const vietmap = window.vietmapgl

      setVietmapgl(vietmap)

      // Check for API key
      if (!VIETMAP_API_KEY) {
        console.warn('Vietmap API key not configured. Please set NEXT_PUBLIC_VIETMAP_API_KEY environment variable.')
      }

      // Use raster style to avoid CORS issues with vector tiles
      const rasterStyle = getVietmapRasterStyle()
      console.log('Vietmap using raster tiles')

      // Create map instance
      const mapInstance = new vietmap.Map({
        container: mapContainer.current!,
        style: rasterStyle,
        center: [center[1], center[0]], // Convert [lat, lng] to [lng, lat]
        zoom: zoom,
        minZoom: VIETMAP_DEFAULT_CONFIG.minZoom,
        maxZoom: VIETMAP_DEFAULT_CONFIG.maxZoom,
      })

      mapInstance.on('load', () => {
        if (!mounted) return
        console.log('Vietmap loaded successfully')
        setIsMapReady(true)
      })

      mapInstance.on('error', (e: any) => {
        console.error('Vietmap error:', e)
      })

      // Add navigation controls
      mapInstance.addControl(new vietmap.NavigationControl(), 'bottom-right')

      // Add fullscreen control
      mapInstance.addControl(new vietmap.FullscreenControl(), 'bottom-right')

      // Add scale control
      mapInstance.addControl(new vietmap.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }), 'bottom-left')

      map.current = mapInstance
    }

    initMap()

    return () => {
      mounted = false
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update markers when surveys change
  useEffect(() => {
    if (isMapReady) {
      updateMarkers()
    }
  }, [isMapReady, updateMarkers])

  // Display polygon for selected survey
  useEffect(() => {
    if (!map.current || !isMapReady || !selectedSurvey) return

    // Remove existing polygon layer
    if (polygonLayerRef.current) {
      if (map.current.getLayer(polygonLayerRef.current)) {
        map.current.removeLayer(polygonLayerRef.current)
      }
      if (map.current.getSource(polygonLayerRef.current)) {
        map.current.removeSource(polygonLayerRef.current)
      }
      polygonLayerRef.current = null
    }

    if (selectedSurvey.polygon_geometry) {
      const coordinates = parsePolygonGeometry(selectedSurvey.polygon_geometry)

      if (coordinates.length > 0) {
        const sourceId = `polygon-${selectedSurvey.id}`
        const layerId = `polygon-layer-${selectedSurvey.id}`

        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: coordinates
            }
          }
        })

        map.current.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.3
          }
        })

        map.current.addLayer({
          id: layerId + '-outline',
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2
          }
        })

        polygonLayerRef.current = sourceId
      }
    }
  }, [selectedSurvey, isMapReady])

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
                        <div className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0`}
                          style={{ backgroundColor: getMarkerColor(survey.status) }} />
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

      {/* Map Controls */}
      <div className="absolute top-3 right-3 z-[10] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 space-y-2">
        {/* Style Selector */}
        <div className="relative">
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="w-full px-3 py-2 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center justify-between gap-2 transition-colors"
          >
            <span className="flex items-center gap-2">
              {STYLE_OPTIONS[currentStyle].icon}
              {STYLE_OPTIONS[currentStyle].name}
            </span>
            <svg className={`w-4 h-4 transition-transform ${showStyleMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showStyleMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20">
              {(Object.keys(STYLE_OPTIONS) as MapStyleKey[]).map((styleKey) => (
                <button
                  key={styleKey}
                  onClick={() => changeStyle(styleKey)}
                  className={`w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    currentStyle === styleKey
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {STYLE_OPTIONS[styleKey].icon}
                  {STYLE_OPTIONS[styleKey].name}
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

        {/* Mode Buttons */}
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
        {mapMode === 'trafficLights' ? (
          <>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <TrafficCone className="h-4 w-4" />
              Trạng thái mã định danh
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"></div>
                <span>Đang hoạt động</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></div>
                <span>Đã vô hiệu hóa</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <h4 className="font-semibold text-sm mb-2">Trạng thái</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Chờ xử lý</span>
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
          </>
        )}
      </div>

      {/* Vietmap Attribution */}
      <div className="absolute bottom-3 left-3 z-[10] text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
        © <a href="https://vietmap.vn" target="_blank" rel="noopener noreferrer" className="hover:underline">Vietmap</a>
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
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeColor(selectedSurvey.status)}`}>
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
              {selectedSurvey.owner_name && (
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Chủ sở hữu</p>
                    <p className="text-sm font-medium truncate">{selectedSurvey.owner_name}</p>
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

      {/* CSS for marker animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.8); }
        }
        .vietmap-marker {
          transition: transform 0.2s ease;
        }
      `}</style>
    </div>
  )
}

export default VietmapSurveyMap
