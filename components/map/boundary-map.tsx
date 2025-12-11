'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Database, Province, Ward } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import {
  PROVINCE_GEOJSON_MAP,
  getProvinceConfig,
  getProvinceGeoJsonUrl,
  getWardGeoJsonUrl,
} from '@/lib/config/province-geojson'
import { EntryPoint, ENTRY_TYPE_LABELS } from '@/lib/types/entry-points'
import { MapPin, Home, Search, X, ChevronDown, User, Calendar, ExternalLink, DoorOpen, Ruler } from 'lucide-react'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']
type UserRole = 'commune_officer' | 'commune_supervisor' | 'central_admin' | 'admin'

interface BoundaryMapProps {
  role: UserRole
  userProvinceId?: number | null
  userWardId?: number | null
  surveys?: SurveyLocation[]
  onSurveySelect?: (survey: SurveyLocation) => void
  height?: string
  baseDetailUrl?: string
  entryPoints?: EntryPoint[]
}

// Searchable Select Component
interface SearchableSelectProps {
  options: { value: string; label: string; count?: number }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}

function SearchableSelect({ options, value, onChange, placeholder, disabled }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const query = search.toLowerCase()
    return options.filter(opt => opt.label.toLowerCase().includes(query))
  }, [options, search])

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative min-w-[240px]">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg shadow text-sm text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.label}
              {selectedOption.count !== undefined && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {selectedOption.count}
                </span>
              )}
            </span>
          ) : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-[1100] max-h-[300px] overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-[240px] overflow-y-auto">
            {/* Clear option */}
            <button
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
            >
              {placeholder}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between ${
                    opt.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.count !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      opt.count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {opt.count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BoundaryMap({
  role,
  userProvinceId,
  userWardId,
  surveys = [],
  onSurveySelect,
  height = '600px',
  baseDetailUrl = '/commune/surveys',
  entryPoints = []
}: BoundaryMapProps) {
  const mapRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const provinceLayerRef = useRef<any>(null)
  const wardLayerRef = useRef<any>(null)
  const surveyLayerRef = useRef<any>(null)
  const maskLayerRef = useRef<any>(null)
  const vietnamMaskLayerRef = useRef<any>(null)
  const vietnamBoundaryRef = useRef<any>(null)
  const islandsLayerRef = useRef<any>(null)
  const polygonLayerRef = useRef<any>(null)
  const entryPointsLayerRef = useRef<any>(null)
  const [mapId] = useState(`boundary-map-${Math.random().toString(36).substr(2, 9)}`)
  const [isMapReady, setIsMapReady] = useState(false)
  const [loadingGeoJson, setLoadingGeoJson] = useState(false)

  // Database data
  const [provinces, setProvinces] = useState<Province[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Selection state
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null)
  const [selectedWardCode, setSelectedWardCode] = useState<number | null>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyLocation | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SurveyLocation[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // GeoJSON data
  const [wardData, setWardData] = useState<any>(null)
  const [provinceData, setProvinceData] = useState<any>(null)
  const [vietnamGeoJson, setVietnamGeoJson] = useState<any>(null)

  const supabase = createClient()

  // Role permissions
  const canSelectProvince = role === 'central_admin' || role === 'admin'
  const canSelectWard = role === 'commune_supervisor' || role === 'central_admin' || role === 'admin'
  const isWardOnly = role === 'commune_officer'

  // Count surveys by province and ward
  const surveyCountByProvince = useMemo(() => {
    const counts: Record<number, number> = {}
    surveys.forEach(s => {
      const code = s.province_id
      if (code) counts[code] = (counts[code] || 0) + 1
    })
    return counts
  }, [surveys])

  const surveyCountByWard = useMemo(() => {
    const counts: Record<string, number> = {}
    surveys.forEach(s => {
      const code = s.ward_code || s.ward_id?.toString()
      if (code) counts[code] = (counts[code] || 0) + 1
    })
    return counts
  }, [surveys])

  // Province options with count
  const provinceOptions = useMemo(() => {
    return provinces.map(p => ({
      value: p.code.toString(),
      label: p.name,
      count: surveyCountByProvince[p.code] || 0
    }))
  }, [provinces, surveyCountByProvince])

  // Ward options with count
  const wardOptions = useMemo(() => {
    return wards.map(w => ({
      value: w.code.toString(),
      label: w.name,
      count: surveyCountByWard[w.code.toString()] || 0
    }))
  }, [wards, surveyCountByWard])

  // Search function
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

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
  }, [searchQuery, surveys])

  // Go to survey
  const goToSurvey = useCallback((survey: SurveyLocation) => {
    setSelectedSurvey(survey)
    setShowSearchResults(false)
    if (mapRef.current && survey.latitude && survey.longitude) {
      mapRef.current.flyTo([survey.latitude, survey.longitude], 17, {
        duration: 1.5,
        easeLinearity: 0.25
      })
    }
    if (onSurveySelect) {
      onSurveySelect(survey)
    }
  }, [onSurveySelect])

  // Load Vietnam GeoJSON for central admin default view
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

  // Fetch provinces
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        const { data: provincesData } = await supabase
          .from('provinces')
          .select('*')
          .order('name')

        if (provincesData) {
          setProvinces(provincesData)
        }

        if (role === 'commune_officer' || role === 'commune_supervisor') {
          if (userProvinceId) {
            setSelectedProvinceCode(userProvinceId)
          }
        }

        if (role === 'commune_officer' && userWardId) {
          setSelectedWardCode(userWardId)
        }
      } catch (error) {
        console.error('Error fetching provinces:', error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [role, userProvinceId, userWardId])

  // Fetch wards when province changes
  useEffect(() => {
    const fetchWards = async () => {
      if (!selectedProvinceCode) {
        setWards([])
        return
      }

      try {
        const { data: wardsData } = await supabase
          .from('wards')
          .select('*')
          .eq('province_code', selectedProvinceCode)
          .order('name')

        if (wardsData) {
          setWards(wardsData)
        }
      } catch (error) {
        console.error('Error fetching wards:', error)
      }
    }

    fetchWards()
  }, [selectedProvinceCode])

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      leafletRef.current = L

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const container = document.getElementById(mapId)
      if (!container) return

      const map = L.map(mapId, {
        center: [16.0, 106.0],
        zoom: 6,
        zoomControl: false,
        attributionControl: true,
        maxBoundsViscosity: 1.0
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(map)

      L.control.zoom({ position: 'topright' }).addTo(map)

      mapRef.current = map
      setIsMapReady(true)
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [mapId])

  // Vietnam Islands data
  const VIETNAM_ISLANDS = {
    hoangSa: {
      name: 'Quần đảo Hoàng Sa',
      nameEn: 'Paracel Islands',
      center: [16.5, 112.0] as [number, number],
      description: 'Thuộc chủ quyền Việt Nam'
    },
    truongSa: {
      name: 'Quần đảo Trường Sa',
      nameEn: 'Spratly Islands',
      center: [9.5, 114.0] as [number, number],
      description: 'Thuộc chủ quyền Việt Nam'
    }
  }

  // Render Vietnam boundary and mask when no province is selected (for central_admin)
  useEffect(() => {
    if (!isMapReady || !leafletRef.current || !mapRef.current) return

    // Only show Vietnam mask when central_admin and no province selected
    if (role !== 'central_admin' && role !== 'admin') return
    if (selectedProvinceCode) return // Province is selected, use province mask instead
    if (!vietnamGeoJson) return

    const L = leafletRef.current

    // Clear existing Vietnam layers
    if (vietnamMaskLayerRef.current) {
      mapRef.current.removeLayer(vietnamMaskLayerRef.current)
      vietnamMaskLayerRef.current = null
    }
    if (vietnamBoundaryRef.current) {
      mapRef.current.removeLayer(vietnamBoundaryRef.current)
      vietnamBoundaryRef.current = null
    }
    if (islandsLayerRef.current) {
      mapRef.current.removeLayer(islandsLayerRef.current)
      islandsLayerRef.current = null
    }

    // Create world bounds
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
        fillColor: '#f8fafc',
        fillOpacity: 0.95,
        interactive: false
      })
      maskPolygon.addTo(mapRef.current)
      vietnamMaskLayerRef.current = maskPolygon
      maskPolygon.bringToBack()

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

    // Add Hoàng Sa and Trường Sa labels
    const islandsLayer = L.layerGroup()

    // Helper function to create archipelago label
    const createArchipelagoLabel = (coords: [number, number], name: string, description: string) => {
      const icon = L.divIcon({
        className: 'vietnam-archipelago-marker',
        html: `<div style="
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
            border: 2px solid #fef2f2;
            text-align: center;
          ">
            <div style="display: flex; align-items: center; gap: 6px; justify-content: center;">
              <span style="font-size: 14px;">🇻🇳</span>
              ${name}
            </div>
            <div style="font-size: 10px; font-weight: 400; margin-top: 2px; opacity: 0.9;">
              ${description}
            </div>
          </div>`,
        iconSize: [200, 50],
        iconAnchor: [100, 25],
      })

      return L.marker(coords, { icon, interactive: false })
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

    // Set map view to Vietnam
    mapRef.current.setView([16.0, 108.0], 6)

  }, [isMapReady, vietnamGeoJson, selectedProvinceCode, role])

  // Load GeoJSON
  useEffect(() => {
    if (!isMapReady || !selectedProvinceCode) return

    const loadGeoJson = async () => {
      setLoadingGeoJson(true)

      try {
        const provinceCodeStr = selectedProvinceCode.toString().padStart(2, '0')

        const provinceUrl = getProvinceGeoJsonUrl(provinceCodeStr)
        if (provinceUrl) {
          const response = await fetch(provinceUrl)
          if (response.ok) {
            const data = await response.json()
            setProvinceData(data)
          } else {
            setProvinceData(null)
          }
        }

        const wardUrl = getWardGeoJsonUrl(provinceCodeStr)
        if (wardUrl) {
          const response = await fetch(wardUrl)
          if (response.ok) {
            const data = await response.json()
            setWardData(data)
          } else {
            setWardData(null)
          }
        }
      } catch (error) {
        console.error('Error loading GeoJSON:', error)
      } finally {
        setLoadingGeoJson(false)
      }
    }

    loadGeoJson()
  }, [isMapReady, selectedProvinceCode])

  // Render mask outside boundary
  useEffect(() => {
    if (!isMapReady || !provinceData) return
    const L = leafletRef.current
    if (!L || !mapRef.current) return

    // Clear previous mask
    if (maskLayerRef.current) {
      mapRef.current.removeLayer(maskLayerRef.current)
    }

    // Clear Vietnam-level layers when province is selected
    if (vietnamMaskLayerRef.current) {
      mapRef.current.removeLayer(vietnamMaskLayerRef.current)
      vietnamMaskLayerRef.current = null
    }
    if (vietnamBoundaryRef.current) {
      mapRef.current.removeLayer(vietnamBoundaryRef.current)
      vietnamBoundaryRef.current = null
    }
    if (islandsLayerRef.current) {
      mapRef.current.removeLayer(islandsLayerRef.current)
      islandsLayerRef.current = null
    }

    // Create world bounds
    const worldBounds: [number, number][] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
      [-90, -180]
    ]

    // Get province coordinates
    const getCoords = (geometry: any): [number, number][][] => {
      if (geometry.type === 'Polygon') {
        return geometry.coordinates.map((ring: number[][]) =>
          ring.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
        )
      } else if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.flatMap((polygon: number[][][]) =>
          polygon.map((ring: number[][]) =>
            ring.map((coord: number[]) => [coord[1], coord[0]] as [number, number])
          )
        )
      }
      return []
    }

    const feature = provinceData.features?.[0]
    if (feature) {
      const holes = getCoords(feature.geometry)

      // Create mask polygon (world with province as hole)
      maskLayerRef.current = L.polygon([worldBounds, ...holes], {
        fillColor: '#f8fafc',
        fillOpacity: 0.95,
        stroke: false,
        interactive: false
      }).addTo(mapRef.current)

      // Send mask to back
      maskLayerRef.current.bringToBack()
    }
  }, [isMapReady, provinceData])

  // Render province boundary
  useEffect(() => {
    if (!isMapReady || !provinceData) return
    const L = leafletRef.current
    if (!L || !mapRef.current) return

    if (provinceLayerRef.current) {
      mapRef.current.removeLayer(provinceLayerRef.current)
    }

    provinceLayerRef.current = L.geoJSON(provinceData, {
      style: {
        fillColor: '#3b82f6',
        fillOpacity: 0.05,
        color: '#1d4ed8',
        weight: 3,
        opacity: 1
      },
      interactive: false
    }).addTo(mapRef.current)

    const bounds = provinceLayerRef.current.getBounds()
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20] })
      // Set max bounds to prevent zooming out too far
      mapRef.current.setMaxBounds(bounds.pad(0.5))
    }
  }, [isMapReady, provinceData])

  // Render ward boundaries
  useEffect(() => {
    if (!isMapReady || !wardData) return
    const L = leafletRef.current
    if (!L || !mapRef.current) return

    if (wardLayerRef.current) {
      mapRef.current.removeLayer(wardLayerRef.current)
    }

    const getFillColor = (wardCode: string): string => {
      const count = surveyCountByWard[wardCode] || 0
      if (count === 0) return '#f1f5f9'
      if (count < 5) return '#bbf7d0'
      if (count < 10) return '#86efac'
      if (count < 20) return '#4ade80'
      if (count < 50) return '#22c55e'
      return '#16a34a'
    }

    let featuresToShow = wardData
    if (selectedWardCode && isWardOnly) {
      const filteredFeatures = wardData.features?.filter((f: any) => {
        const wardCode = f.properties?.ma_xa
        return wardCode === selectedWardCode.toString()
      })
      if (filteredFeatures?.length > 0) {
        featuresToShow = { ...wardData, features: filteredFeatures }
      }
    }

    wardLayerRef.current = L.geoJSON(featuresToShow, {
      style: (feature: any) => {
        const wardCode = feature.properties?.ma_xa
        const isHighlighted = selectedWardCode && wardCode === selectedWardCode.toString()
        return {
          fillColor: isHighlighted ? '#fbbf24' : getFillColor(wardCode),
          fillOpacity: isHighlighted ? 0.5 : 0.3,
          color: isHighlighted ? '#f59e0b' : '#9ca3af',
          weight: isHighlighted ? 2 : 1,
          opacity: 1
        }
      },
      interactive: false
    }).addTo(mapRef.current)

    if (selectedWardCode && isWardOnly) {
      const bounds = wardLayerRef.current.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] })
        mapRef.current.setMaxBounds(bounds.pad(0.5))
      }
    }
  }, [isMapReady, wardData, selectedWardCode, isWardOnly, surveyCountByWard])

  // Render survey markers
  useEffect(() => {
    if (!isMapReady) return
    const L = leafletRef.current
    if (!L || !mapRef.current) return

    if (surveyLayerRef.current) {
      mapRef.current.removeLayer(surveyLayerRef.current)
    }

    surveyLayerRef.current = L.layerGroup().addTo(mapRef.current)

    const createMarkerIcon = (status: string, isSelected: boolean) => {
      const colors: Record<string, string> = {
        'approved_central': '#22c55e',
        'approved_province': '#3b82f6',
        'pending': '#f59e0b',
        'rejected': '#ef4444',
        'draft': '#6b7280'
      }
      const color = colors[status] || '#6b7280'
      const size = isSelected ? 16 : 12
      const border = isSelected ? 3 : 2

      return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: ${border}px solid ${isSelected ? '#1d4ed8' : 'white'};
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          ${isSelected ? 'animation: pulse 1.5s infinite;' : ''}
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      })
    }

    let filteredSurveys = surveys
    if (selectedWardCode) {
      filteredSurveys = surveys.filter(s =>
        s.ward_code === selectedWardCode.toString() ||
        s.ward_id === selectedWardCode
      )
    }

    filteredSurveys.forEach(survey => {
      if (!survey.latitude || !survey.longitude) return

      const isSelected = selectedSurvey?.id === survey.id
      const marker = L.marker([survey.latitude, survey.longitude], {
        icon: createMarkerIcon(survey.status, isSelected),
        zIndexOffset: isSelected ? 1000 : 0
      })

      marker.on('click', () => {
        goToSurvey(survey)
      })

      marker.addTo(surveyLayerRef.current)
    })
  }, [isMapReady, surveys, selectedWardCode, selectedSurvey, goToSurvey])

  // Helper function to parse polygon geometry
  const parsePolygonGeometry = useCallback((geometry: any): [number, number][] => {
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
  }, [])

  // Display polygon for selected survey
  useEffect(() => {
    if (!isMapReady || !leafletRef.current || !mapRef.current) return

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
      }
    }
  }, [selectedSurvey, isMapReady, parsePolygonGeometry])

  // Display entry points on map
  useEffect(() => {
    if (!isMapReady || !leafletRef.current || !mapRef.current) return

    const L = leafletRef.current

    // Clear existing entry points layer
    if (entryPointsLayerRef.current) {
      mapRef.current.removeLayer(entryPointsLayerRef.current)
      entryPointsLayerRef.current = null
    }

    // Filter entry points for selected survey
    const surveyEntryPoints = selectedSurvey
      ? entryPoints.filter(ep => ep.surveyLocationId === selectedSurvey.id)
      : []

    if (surveyEntryPoints.length === 0) return

    const entryPointsLayer = L.layerGroup()

    surveyEntryPoints.forEach((ep) => {
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
  }, [entryPoints, selectedSurvey, isMapReady])

  // Reset view
  const resetView = useCallback(() => {
    if (!mapRef.current) return
    if (provinceLayerRef.current) {
      const bounds = provinceLayerRef.current.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [20, 20] })
      }
    }
    setSelectedSurvey(null)
  }, [])

  // Get names
  const selectedProvinceName = provinces.find(p => p.code === selectedProvinceCode)?.name
  const selectedWardName = wards.find(w => w.code === selectedWardCode)?.name

  // Get status label
  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      'approved_central': { text: 'Đã duyệt TW', color: 'bg-green-100 text-green-800' },
      'approved_province': { text: 'Đã duyệt Tỉnh', color: 'bg-blue-100 text-blue-800' },
      'pending': { text: 'Chờ duyệt', color: 'bg-amber-100 text-amber-800' },
      'rejected': { text: 'Từ chối', color: 'bg-red-100 text-red-800' },
      'draft': { text: 'Nháp', color: 'bg-gray-100 text-gray-800' }
    }
    return labels[status] || { text: status, color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="relative" style={{ height }}>
      <div id={mapId} className="w-full h-full rounded-lg" />

      {/* Loading */}
      {(loadingGeoJson || loadingData) && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Đang tải bản đồ...</span>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {/* Search */}
        <div className="relative">
          <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow overflow-hidden">
            <Search className="h-4 w-4 text-gray-400 ml-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm mã định danh, tên, địa chỉ..."
              className="px-3 py-2 text-sm w-[280px] focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }} className="px-2">
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
            <button
              onClick={handleSearch}
              className="px-3 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Tìm
            </button>
          </div>

          {/* Search Results */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">Không tìm thấy kết quả</div>
              ) : (
                searchResults.map(survey => (
                  <button
                    key={survey.id}
                    onClick={() => goToSurvey(survey)}
                    className="w-full p-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-sm text-gray-900">{survey.location_name || 'Chưa đặt tên'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{survey.address || 'Chưa có địa chỉ'}</div>
                    {survey.location_identifier && (
                      <div className="text-xs font-mono text-blue-600 mt-0.5">{survey.location_identifier}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Province Selector */}
        {canSelectProvince && (
          <SearchableSelect
            options={provinceOptions}
            value={selectedProvinceCode?.toString() || ''}
            onChange={(v) => { setSelectedProvinceCode(v ? parseInt(v) : null); setSelectedWardCode(null); }}
            placeholder="-- Chọn Tỉnh/Thành phố --"
          />
        )}

        {/* Ward Selector */}
        {canSelectWard && selectedProvinceCode && wards.length > 0 && (
          <SearchableSelect
            options={wardOptions}
            value={selectedWardCode?.toString() || ''}
            onChange={(v) => setSelectedWardCode(v ? parseInt(v) : null)}
            placeholder="-- Tất cả xã/phường --"
          />
        )}

        {/* Ward info for commune */}
        {isWardOnly && selectedWardName && (
          <div className="bg-white border border-gray-300 rounded-lg shadow px-3 py-2">
            <div className="text-xs text-gray-500">Xã/Phường của bạn</div>
            <div className="text-sm font-medium text-gray-900">{selectedWardName}</div>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="absolute top-4 right-16 z-[1000]">
        <button
          onClick={resetView}
          className="p-2 bg-white border border-gray-300 rounded-lg shadow hover:bg-gray-50"
          title="Về vị trí ban đầu"
        >
          <Home className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Selected Survey Card */}
      {selectedSurvey && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 w-[320px]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {selectedSurvey.location_name || 'Chưa đặt tên'}
                </h4>
                <p className="text-sm text-gray-500 truncate">
                  {selectedSurvey.address || 'Chưa có địa chỉ'}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedSurvey(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedSurvey.location_identifier && (
            <div className="mt-3 px-2 py-1.5 bg-blue-50 rounded text-sm font-mono text-blue-700">
              {selectedSurvey.location_identifier}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{selectedSurvey.owner_name || '-'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(selectedSurvey.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          {/* Polygon indicator */}
          {selectedSurvey.polygon_geometry && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 rounded text-blue-700 text-xs">
              <Ruler className="h-3.5 w-3.5" />
              <span>Có dữ liệu ranh giới polygon</span>
              {selectedSurvey.land_area_m2 && (
                <span className="ml-auto font-medium">{selectedSurvey.land_area_m2.toLocaleString('vi-VN')} m²</span>
              )}
            </div>
          )}

          {/* Entry points indicator */}
          {entryPoints.filter(ep => ep.surveyLocationId === selectedSurvey.id).length > 0 && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 rounded text-green-700 text-xs">
              <DoorOpen className="h-3.5 w-3.5" />
              <span>{entryPoints.filter(ep => ep.surveyLocationId === selectedSurvey.id).length} lối vào</span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusLabel(selectedSurvey.status).color}`}>
              {getStatusLabel(selectedSurvey.status).text}
            </span>
            <Link
              href={`${baseDetailUrl}/${selectedSurvey.id}`}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              Xem chi tiết
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
        <h5 className="text-xs font-medium text-gray-700 mb-2">Số khảo sát</h5>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f1f5f9' }} />
            <span>0</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#bbf7d0' }} />
            <span>1-4</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4ade80' }} />
            <span>10-19</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16a34a' }} />
            <span>50+</span>
          </div>
        </div>

        {/* Entry Points Legend */}
        {entryPoints.length > 0 && (
          <>
            <hr className="my-2 border-gray-200" />
            <h5 className="text-xs font-medium text-gray-700 mb-2">Lối vào</h5>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#16a34a' }} />
                <span>Lối vào chính</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                <span>Lối vào phụ</span>
              </div>
            </div>
          </>
        )}

        {/* Polygon Legend */}
        {selectedSurvey?.polygon_geometry && (
          <>
            <hr className="my-2 border-gray-200" />
            <h5 className="text-xs font-medium text-gray-700 mb-2">Ranh giới</h5>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 border-2 rounded" style={{ borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)' }} />
              <span>Polygon</span>
            </div>
          </>
        )}
      </div>

      {/* Vietnam Sovereignty Legend - shown when no province selected */}
      {(role === 'central_admin' || role === 'admin') && !selectedProvinceCode && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-[200px]">
          <h5 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-2">
            🇻🇳 Lãnh thổ Việt Nam
          </h5>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 border-2 border-red-600 border-dashed"></div>
              <span>Biên giới Việt Nam</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-red-50 border border-red-600 border-dashed"></div>
              <span>Vùng biển đảo</span>
            </div>
            <div className="pt-1 border-t border-gray-100 mt-1">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Hoàng Sa và Trường Sa là lãnh thổ thiêng liêng của Việt Nam
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .entry-point-marker {
          background: transparent !important;
          border: none !important;
        }
        .vietnam-archipelago-marker {
          background: transparent !important;
          border: none !important;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
