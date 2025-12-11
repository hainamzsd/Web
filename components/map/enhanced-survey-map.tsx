'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Database } from '@/lib/types/database'
import { EntryPoint, ENTRY_TYPE_LABELS } from '@/lib/types/entry-points'
import { X, MapPin, User, Ruler, Navigation, Calendar, ExternalLink, Search, ArrowRight, Tag, Building, TrafficCone, Flag } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { createTrafficLightIcon, createTrafficLightPopup, getTrafficLightStatus, LocationIdentifierData } from './traffic-light-marker'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

// Vietnam islands data with proper Vietnamese names (sovereignty assertion)
const VIETNAM_ISLANDS = {
  hoangSa: {
    name: 'Quần đảo Hoàng Sa',
    nameEn: 'Paracel Islands',
    center: [16.35, 112.0] as [number, number],
    description: 'Thuộc chủ quyền Việt Nam'
  },
  truongSa: {
    name: 'Quần đảo Trường Sa',
    nameEn: 'Spratly Islands',
    center: [9.0, 114.0] as [number, number],
    description: 'Thuộc chủ quyền Việt Nam'
  }
}

// Extended survey type with location identifier data for traffic lights
export interface SurveyWithLocationId extends SurveyLocation {
  location_identifier_data?: LocationIdentifierData | null
}

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
  entryPoints?: EntryPoint[]
  showInfoCard?: boolean
  height?: string
  showSearch?: boolean
  baseDetailUrl?: string
  /** Location identifiers data for traffic light mode. Key is survey_location_id */
  locationIdentifiers?: Record<string, LocationIdentifierData>
  /** GeoJSON data for ward boundary restriction */
  wardBoundary?: any
  /** Whether to restrict view to ward boundary (mask outside areas) */
  restrictToWardBoundary?: boolean
  /** Hide Vietnam-wide features like islands when showing ward only */
  hideVietnamFeatures?: boolean
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
  onSurveySelect,
  entryPoints = [],
  showInfoCard = true,
  height = '600px',
  showSearch = true,
  baseDetailUrl = '/commune/surveys',
  locationIdentifiers = {},
  wardBoundary,
  restrictToWardBoundary = false,
  hideVietnamFeatures = false
}: EnhancedSurveyMapProps) {
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const markerLayerRef = useRef<any>(null)
  const heatmapLayerRef = useRef<any>(null)
  const drawControlRef = useRef<any>(null)
  const drawnItemsRef = useRef<any>(null)
  const polygonLayerRef = useRef<any>(null)
  const entryPointsLayerRef = useRef<any>(null)
  const trafficLightLayerRef = useRef<any>(null)
  const vietnamBoundaryRef = useRef<any>(null)
  const maskLayerRef = useRef<any>(null)
  const islandsLayerRef = useRef<any>(null)
  const wardBoundaryLayerRef = useRef<any>(null)
  const wardMaskLayerRef = useRef<any>(null)
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap' | 'clusters' | 'trafficLights'>('markers')
  const [vietnamGeoJson, setVietnamGeoJson] = useState<any>(null)
  const [mapId] = useState(`enhanced-map-${Math.random().toString(36).substr(2, 9)}`)
  const [isMapReady, setIsMapReady] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyLocation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SurveyLocation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Search function - search by location_identifier, location_name, address, owner_name
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    const query = searchQuery.toLowerCase().trim()

    const results = surveys.filter(survey => {
      // Search by location identifier (exact or partial match)
      if (survey.location_identifier?.toLowerCase().includes(query)) return true
      // Search by location name
      if (survey.location_name?.toLowerCase().includes(query)) return true
      // Search by address
      if (survey.address?.toLowerCase().includes(query)) return true
      // Search by owner name
      if (survey.owner_name?.toLowerCase().includes(query)) return true
      return false
    })

    setSearchResults(results.slice(0, 10)) // Limit to 10 results
    setShowSearchResults(true)
    setIsSearching(false)
  }, [searchQuery, surveys])

  // Handle search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Navigate to search result
  const goToSurvey = (survey: SurveyLocation) => {
    setSelectedSurvey(survey)
    setShowSearchResults(false)
    if (mapRef.current && survey.latitude && survey.longitude) {
      // Use flyTo for smooth animation, zoom level 17 for good tile coverage
      mapRef.current.flyTo([survey.latitude, survey.longitude], 17, {
        duration: 1.5,
        easeLinearity: 0.25
      })
    }
    if (onSurveySelect) {
      onSurveySelect(survey)
    }
  }

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

  // Display entry points on map
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !isMapReady) return

    const L = leafletRef.current

    // Clear existing entry points layer
    if (entryPointsLayerRef.current) {
      mapRef.current.removeLayer(entryPointsLayerRef.current)
      entryPointsLayerRef.current = null
    }

    if (entryPoints.length === 0) return

    const entryPointsLayer = L.layerGroup()

    entryPoints.forEach((ep, index) => {
      const isPrimary = ep.isPrimary
      const bgColor = isPrimary ? '#16a34a' : '#22c55e'
      const borderColor = isPrimary ? '#15803d' : '#16a34a'

      // Create custom icon for entry point
      const icon = L.divIcon({
        className: 'entry-point-marker',
        html: `
          <div style="
            position: relative;
            width: 28px;
            height: 28px;
          ">
            <div style="
              background-color: ${bgColor};
              width: 28px;
              height: 28px;
              border-radius: 50%;
              border: 3px solid ${borderColor};
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            ${isPrimary ? `
              <div style="
                position: absolute;
                top: -6px;
                right: -6px;
                background-color: #f59e0b;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                border: 2px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
            ` : ''}
            <div style="
              position: absolute;
              bottom: -18px;
              left: 50%;
              transform: translateX(-50%);
              background-color: white;
              color: #374151;
              font-size: 10px;
              font-weight: 600;
              padding: 1px 4px;
              border-radius: 3px;
              white-space: nowrap;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            ">#${ep.sequenceNumber}</div>
          </div>
        `,
        iconSize: [28, 46],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      })

      const marker = L.marker([ep.latitude, ep.longitude], { icon })

      const typeLabel = ENTRY_TYPE_LABELS[ep.entryType] || ep.entryType
      const directionLabel = ep.facingDirection ? `Hướng: ${ep.facingDirection}` : ''

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="
              background-color: ${bgColor};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div>
              <h3 style="font-weight: bold; color: ${bgColor}; margin: 0; font-size: 13px;">
                Lối vào #${ep.sequenceNumber}
              </h3>
              ${isPrimary ? '<span style="font-size: 10px; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 3px;">Chính</span>' : ''}
            </div>
          </div>
          <div style="font-size: 12px; color: #666; space-y: 4px;">
            <p style="margin: 4px 0;"><strong>Loại:</strong> ${typeLabel}</p>
            ${directionLabel ? `<p style="margin: 4px 0;"><strong>${directionLabel}</strong></p>` : ''}
            ${ep.addressFull ? `<p style="margin: 4px 0;"><strong>Địa chỉ:</strong> ${ep.addressFull}</p>` : ''}
            ${ep.notes ? `<p style="margin: 4px 0; font-style: italic; color: #888;">"${ep.notes}"</p>` : ''}
          </div>
          <div style="font-size: 10px; color: #999; margin-top: 8px; font-family: monospace;">
            ${ep.latitude.toFixed(6)}, ${ep.longitude.toFixed(6)}
          </div>
        </div>
      `)

      entryPointsLayer.addLayer(marker)
    })

    entryPointsLayer.addTo(mapRef.current)
    entryPointsLayerRef.current = entryPointsLayer
  }, [entryPoints, isMapReady])

  // Load Vietnam GeoJSON
  useEffect(() => {
    const loadVietnamGeoJson = async () => {
      try {
        const response = await fetch('/vn.json')
        const data = await response.json()
        setVietnamGeoJson(data)
      } catch (error) {
        console.error('Failed to load Vietnam GeoJSON:', error)
      }
    }
    loadVietnamGeoJson()
  }, [])

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const initMap = async () => {
      // Dynamically import leaflet
      const L = await import('leaflet')

      if (!mounted) return

      leafletRef.current = L.default || L

      const mapElement = document.getElementById(mapId)
      if (!mapElement || mapRef.current) return

      const map = leafletRef.current.map(mapId, {
        center,
        zoom,
        zoomControl: true,
        minZoom: 5,
        maxZoom: 19,
      })

      // Add tile layer
      leafletRef.current.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Bản đồ Việt Nam',
        maxZoom: 19,
        maxNativeZoom: 19,
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

  // Add Vietnam boundary and mask outside areas
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !isMapReady || !vietnamGeoJson) return

    const L = leafletRef.current

    // Clear existing layers
    if (maskLayerRef.current) {
      mapRef.current.removeLayer(maskLayerRef.current)
      maskLayerRef.current = null
    }
    if (vietnamBoundaryRef.current) {
      mapRef.current.removeLayer(vietnamBoundaryRef.current)
      vietnamBoundaryRef.current = null
    }
    if (islandsLayerRef.current) {
      mapRef.current.removeLayer(islandsLayerRef.current)
      islandsLayerRef.current = null
    }

    // Skip Vietnam-wide features if we're restricting to ward boundary
    if (restrictToWardBoundary && wardBoundary) return

    // Create world bounds (large rectangle covering the map area)
    const worldBounds: [number, number][] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
      [-90, -180]
    ]

    // Extract Vietnam coordinates from GeoJSON
    const vietnamCoords: [number, number][][] = []

    if (vietnamGeoJson.features) {
      vietnamGeoJson.features.forEach((feature: any) => {
        if (feature.geometry) {
          if (feature.geometry.type === 'Polygon') {
            vietnamCoords.push(
              feature.geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number])
            )
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((polygon: number[][][]) => {
              vietnamCoords.push(
                polygon[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number])
              )
            })
          }
        }
      })
    }

    // Create mask polygon (world with Vietnam as holes)
    if (vietnamCoords.length > 0) {
      const maskCoords = [worldBounds, ...vietnamCoords]
      const maskPolygon = L.polygon(maskCoords, {
        color: 'transparent',
        fillColor: '#f3f4f6',
        fillOpacity: 0.9,
        interactive: false
      })
      maskPolygon.addTo(mapRef.current)
      maskLayerRef.current = maskPolygon

      // Add Vietnam boundary outline
      const boundaryLayer = L.geoJSON(vietnamGeoJson, {
        style: {
          color: '#dc2626',
          weight: 2,
          fillColor: 'transparent',
          fillOpacity: 0,
          dashArray: '5, 5'
        }
      })
      boundaryLayer.addTo(mapRef.current)
      vietnamBoundaryRef.current = boundaryLayer
    }

    // Add Hoàng Sa and Trường Sa with Vietnamese names (simplified - only archipelago boundaries)
    const islandsLayer = L.layerGroup()

    // Helper function to create archipelago label
    const createArchipelagoLabel = (coords: number[], name: string, description: string) => {
      const icon = L.divIcon({
        className: 'vietnam-archipelago-marker',
        html: `<div style="
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
            border: 2px solid #fef2f2;
            text-align: center;
          ">
            <div style="display: flex; align-items: center; gap: 6px; justify-content: center;">
              <span style="font-size: 16px;">🇻🇳</span>
              ${name}
            </div>
            <div style="font-size: 10px; font-weight: 400; margin-top: 2px; opacity: 0.9;">
              ${description}
            </div>
          </div>`,
        iconSize: [200, 50],
        iconAnchor: [100, 25],
      })

      return L.marker([coords[0], coords[1]], { icon, interactive: false })
    }

    // Add Hoàng Sa boundary and label
    const hoangSaArea = L.polygon([
      [17.2, 111.0],
      [17.2, 113.0],
      [15.5, 113.0],
      [15.5, 111.0],
    ], {
      color: '#dc2626',
      weight: 2,
      fillColor: '#fef2f2',
      fillOpacity: 0.3,
      dashArray: '10, 5',
      interactive: false
    })
    islandsLayer.addLayer(hoangSaArea)

    const hoangSaLabel = createArchipelagoLabel(
      VIETNAM_ISLANDS.hoangSa.center,
      VIETNAM_ISLANDS.hoangSa.name,
      VIETNAM_ISLANDS.hoangSa.description
    )
    islandsLayer.addLayer(hoangSaLabel)

    // Add Trường Sa boundary and label
    const truongSaArea = L.polygon([
      [12.0, 111.0],
      [12.0, 117.5],
      [6.0, 117.5],
      [6.0, 111.0],
    ], {
      color: '#dc2626',
      weight: 2,
      fillColor: '#fef2f2',
      fillOpacity: 0.3,
      dashArray: '10, 5',
      interactive: false
    })
    islandsLayer.addLayer(truongSaArea)

    const truongSaLabel = createArchipelagoLabel(
      VIETNAM_ISLANDS.truongSa.center,
      VIETNAM_ISLANDS.truongSa.name,
      VIETNAM_ISLANDS.truongSa.description
    )
    islandsLayer.addLayer(truongSaLabel)

    islandsLayer.addTo(mapRef.current)
    islandsLayerRef.current = islandsLayer

  }, [vietnamGeoJson, isMapReady, hideVietnamFeatures, restrictToWardBoundary, wardBoundary])

  // Ward boundary mask effect - for commune officers
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current || !isMapReady) return

    const L = leafletRef.current

    // Clear existing ward boundary layers
    if (wardBoundaryLayerRef.current) {
      mapRef.current.removeLayer(wardBoundaryLayerRef.current)
      wardBoundaryLayerRef.current = null
    }
    if (wardMaskLayerRef.current) {
      mapRef.current.removeLayer(wardMaskLayerRef.current)
      wardMaskLayerRef.current = null
    }

    // If not restricting to ward or no ward boundary, skip
    if (!restrictToWardBoundary || !wardBoundary) return

    // Also hide Vietnam-wide layers when showing ward only
    if (maskLayerRef.current) {
      mapRef.current.removeLayer(maskLayerRef.current)
      maskLayerRef.current = null
    }
    if (vietnamBoundaryRef.current) {
      mapRef.current.removeLayer(vietnamBoundaryRef.current)
      vietnamBoundaryRef.current = null
    }
    if (islandsLayerRef.current) {
      mapRef.current.removeLayer(islandsLayerRef.current)
      islandsLayerRef.current = null
    }

    // Create world bounds for mask
    const worldBounds: [number, number][] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
      [-90, -180]
    ]

    // Extract ward coordinates from GeoJSON
    const wardCoords: [number, number][][] = []

    if (wardBoundary.geometry) {
      // Single feature
      if (wardBoundary.geometry.type === 'Polygon') {
        wardCoords.push(
          wardBoundary.geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number])
        )
      } else if (wardBoundary.geometry.type === 'MultiPolygon') {
        wardBoundary.geometry.coordinates.forEach((polygon: number[][][]) => {
          wardCoords.push(
            polygon[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number])
          )
        })
      }
    }

    if (wardCoords.length > 0) {
      // Create mask polygon (world with ward as hole)
      const maskCoords = [worldBounds, ...wardCoords]
      const maskPolygon = L.polygon(maskCoords, {
        color: 'transparent',
        fillColor: '#e5e7eb',
        fillOpacity: 0.95,
        interactive: false
      })
      maskPolygon.addTo(mapRef.current)
      wardMaskLayerRef.current = maskPolygon

      // Add ward boundary outline
      const wardLayer = L.geoJSON(wardBoundary, {
        style: {
          color: '#2563eb',
          weight: 3,
          fillColor: 'transparent',
          fillOpacity: 0,
          dashArray: '0'
        }
      })
      wardLayer.addTo(mapRef.current)
      wardBoundaryLayerRef.current = wardLayer

      // Fit bounds to ward
      const bounds = wardLayer.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
      }
    }
  }, [wardBoundary, restrictToWardBoundary, isMapReady])

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
    if (trafficLightLayerRef.current) {
      mapRef.current.removeLayer(trafficLightLayerRef.current)
      trafficLightLayerRef.current = null
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
          maxZoom: 18,
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
              <a href="${baseDetailUrl}/${survey.id}" style="color: #3b82f6; text-decoration: underline; font-size: 12px;">
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
      } else if (mapMode === 'trafficLights') {
        // Traffic Light mode - ONLY shows surveys with location_identifiers
        // These are surveys with status 'approved_central' that have been assigned a location ID
        const trafficLightLayer = L.layerGroup()

        // Filter surveys that have location identifiers
        const surveysWithLocationId = validSurveys.filter(survey => {
          const locationId = survey.location_identifier || survey.final_location_id
          return locationId && locationIdentifiers[survey.id]
        })

        if (surveysWithLocationId.length === 0) {
          // Show message if no surveys with location identifiers
          console.log('No surveys with location identifiers found for traffic light display')
        }

        surveysWithLocationId.forEach(survey => {
          const locationIdData = locationIdentifiers[survey.id]
          if (!locationIdData) return

          const locationId = locationIdData.location_id
          const isActive = locationIdData.is_active
          const lightStatus = getTrafficLightStatus(isActive)

          // Create traffic light icon
          const icon = L.divIcon({
            className: 'traffic-light-marker',
            html: createTrafficLightIcon({
              status: lightStatus,
              locationId: locationId,
              pulseAnimation: true
            }),
            iconSize: [40, 95],
            iconAnchor: [20, 75],
            popupAnchor: [0, -55],
          })

          const marker = L.marker([survey.latitude!, survey.longitude!], { icon })

          // Create popup content with location identifier data
          const popupContent = createTrafficLightPopup(
            survey.location_name || 'Chưa đặt tên',
            survey.address || '',
            locationId,
            isActive,
            locationIdData.deactivation_reason || null,
            `${baseDetailUrl}/${survey.id}`
          )

          marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'traffic-light-popup'
          })

          marker.on('click', () => {
            setSelectedSurvey(survey)
            if (onSurveySelect) {
              onSurveySelect(survey)
            }
            if (mapRef.current) {
              mapRef.current.flyTo([survey.latitude!, survey.longitude!], 17, {
                duration: 1.2,
                easeLinearity: 0.25
              })
            }
          })

          trafficLightLayer.addLayer(marker)
        })

        trafficLightLayer.addTo(mapRef.current)
        trafficLightLayerRef.current = trafficLightLayer

        // Fit bounds only if no survey is selected and we have traffic lights
        if (!selectedSurvey && surveysWithLocationId.length > 0) {
          const bounds = L.latLngBounds(surveysWithLocationId.map(s => [s.latitude!, s.longitude!]))
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
        }
      } else {
        // Regular markers mode (default)
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
              <a href="${baseDetailUrl}/${survey.id}" style="color: #3b82f6; text-decoration: underline; font-size: 12px;">
                Xem chi tiết →
              </a>
            </div>
          `)

          marker.on('click', () => {
            setSelectedSurvey(survey)
            if (onSurveySelect) {
              onSurveySelect(survey)
            }
            // Smooth fly to the selected point with reasonable zoom
            if (mapRef.current) {
              mapRef.current.flyTo([survey.latitude!, survey.longitude!], 17, {
                duration: 1.2,
                easeLinearity: 0.25
              })
            }
          })

          markerLayer.addLayer(marker)
        })

        markerLayer.addTo(mapRef.current)
        markerLayerRef.current = markerLayer

        // Fit bounds only if no survey is selected
        if (!selectedSurvey) {
          const bounds = L.latLngBounds(validSurveys.map(s => [s.latitude!, s.longitude!]))
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
        }
      }
    }

    updateMarkers()
  }, [surveys, mapMode, showHeatmap, showClustering, selectedSurveyId, isMapReady, baseDetailUrl, locationIdentifiers])

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

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Search Bar - Top Center */}
      {showSearch && (
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[1001] w-full max-w-md px-4">
          <div className="relative">
            <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="pl-4 pr-2">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Tìm theo mã định danh, tên, địa chỉ..."
                className="flex-1 py-3 px-2 text-sm focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                {isSearching ? 'Đang tìm...' : 'Tìm'}
              </button>
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Không tìm thấy kết quả</p>
                    <p className="text-xs text-gray-400 mt-1">Thử tìm với từ khóa khác</p>
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
                        <div className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ${
                          survey.status === 'published' ? 'bg-green-500' :
                          survey.status === 'approved_central' ? 'bg-blue-500' :
                          survey.status === 'approved_commune' ? 'bg-purple-500' :
                          survey.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900 truncate">
                              {survey.location_name || 'Chưa đặt tên'}
                            </span>
                            {survey.location_identifier && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono">
                                {survey.location_identifier}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {survey.address || 'Chưa có địa chỉ'}
                          </p>
                          {survey.owner_name && (
                            <p className="text-xs text-gray-400 truncate">
                              Chủ: {survey.owner_name}
                            </p>
                          )}
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

      <div id={mapId} className="absolute inset-0 w-full h-full z-0"></div>

      {/* Map Controls removed - always use markers mode */}

      {/* Legend - Bottom Right */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white rounded-lg shadow-lg p-3 max-h-[200px] overflow-y-auto">
        <h4 className="font-semibold text-sm mb-2">Trạng thái khảo sát</h4>
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
        {entryPoints.length > 0 && (
          <>
            <hr className="my-2 border-gray-200" />
            <h4 className="font-semibold text-sm mb-2">Lối vào</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span>Lối vào chính</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span>Lối vào phụ</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Vietnam Sovereignty Legend - Bottom Left (hide when showing ward boundary only) */}
      {!restrictToWardBoundary && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-[200px]">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-red-700">
            <Flag className="h-4 w-4" />
            Lãnh thổ Việt Nam
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-red-600 border-dashed"></div>
              <span>Biên giới Việt Nam</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-600"></div>
              <span>Vùng biển đảo</span>
            </div>
            <div className="pt-1 border-t border-gray-100 mt-1">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Hoàng Sa và Trường Sa thuộc chủ quyền Việt Nam
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ward Boundary Legend - Bottom Left (show when restricting to ward) */}
      {restrictToWardBoundary && wardBoundary && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-[220px]">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-blue-700">
            <MapPin className="h-4 w-4" />
            Địa bàn quản lý
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-600"></div>
              <span>Ranh giới xã/phường</span>
            </div>
            {wardBoundary.properties?.ten_xa && (
              <div className="pt-1 border-t border-gray-100 mt-1">
                <p className="text-[11px] font-medium text-gray-700">
                  {wardBoundary.properties.ten_xa}
                </p>
                {wardBoundary.properties?.ten_tinh && (
                  <p className="text-[10px] text-gray-500">
                    {wardBoundary.properties.ten_tinh}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Card - Left Side */}
      {showInfoCard && selectedSurvey && (
        <div className="absolute top-3 left-3 z-[1001] bg-white rounded-xl shadow-xl border border-gray-200 w-80 max-h-[calc(100%-24px)] overflow-hidden animate-in slide-in-from-left-5 duration-300">
          {/* Header with Location ID */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {selectedSurvey.location_identifier && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">
                      {selectedSurvey.location_identifier}
                    </span>
                  )}
                </div>
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

          {/* Content */}
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Trạng thái</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(selectedSurvey.status)}`}>
                {getStatusLabel(selectedSurvey.status)}
              </span>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-1 gap-3">
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

              {selectedSurvey.object_type && (
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Loại đối tượng</p>
                    <p className="text-sm font-medium">{selectedSurvey.object_type}</p>
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

              {selectedSurvey.accuracy && (
                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Độ chính xác</p>
                    <p className="text-sm font-medium">±{selectedSurvey.accuracy.toFixed(2)}m</p>
                  </div>
                </div>
              )}
            </div>

            {/* Polygon indicator */}
            {selectedSurvey.polygon_geometry && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-blue-700">
                <Tag className="h-4 w-4" />
                <span className="text-xs font-medium">Có dữ liệu ranh giới polygon</span>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Ngày tạo: {formatDate(selectedSurvey.created_at)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <a
                href={`${baseDetailUrl}/${selectedSurvey.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Xem chi tiết
              </a>
              <button
                onClick={() => {
                  if (mapRef.current && selectedSurvey.latitude && selectedSurvey.longitude) {
                    mapRef.current.flyTo([selectedSurvey.latitude, selectedSurvey.longitude], 18, {
                      duration: 1,
                      easeLinearity: 0.25
                    })
                  }
                }}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Zoom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export with dynamic import to avoid SSR issues
export const EnhancedSurveyMap = dynamic(
  () => Promise.resolve(EnhancedSurveyMapComponent),
  { ssr: false }
)
