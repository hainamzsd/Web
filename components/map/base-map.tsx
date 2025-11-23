'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { LatLngExpression } from 'leaflet'
import { MAP_CONFIG } from '@/lib/map/leaflet-config'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface BaseMapProps {
  center?: LatLngExpression
  zoom?: number
  children?: React.ReactNode
  className?: string
  onMapReady?: (map: L.Map) => void
}

// Component to capture map instance and handle cleanup
function MapController({
  onMapReady,
  mapInstanceRef
}: {
  onMapReady?: (map: L.Map) => void
  mapInstanceRef: React.MutableRefObject<L.Map | null>
}) {
  const map = useMap()

  useEffect(() => {
    // Store map instance in ref for cleanup
    mapInstanceRef.current = map

    if (onMapReady) {
      onMapReady(map)
    }

    // Cleanup function - properly remove the map using Leaflet's API
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        } catch (error) {
          console.warn('Error removing map:', error)
        }
      }
    }
  }, [map, onMapReady, mapInstanceRef])

  return null
}

export function BaseMap({
  center = MAP_CONFIG.DEFAULT_CENTER,
  zoom = MAP_CONFIG.DEFAULT_ZOOM,
  children,
  className = "h-full w-full",
  onMapReady
}: BaseMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Don't render until client-side to avoid SSR issues
  if (!isMounted) {
    return <div className={className} style={{ background: '#f0f0f0' }} />
  }

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={MAP_CONFIG.MIN_ZOOM}
        maxZoom={MAP_CONFIG.MAX_ZOOM}
        className="h-full w-full"
        scrollWheelZoom={true}
        preferCanvas={true}
      >
        <TileLayer
          attribution={MAP_CONFIG.TILE_LAYERS.openStreetMap.attribution}
          url={MAP_CONFIG.TILE_LAYERS.openStreetMap.url}
        />
        <MapController onMapReady={onMapReady} mapInstanceRef={mapInstanceRef} />
        {children}
      </MapContainer>
    </div>
  )
}
