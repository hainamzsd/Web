'use client'

import { useEffect, useState, useRef, useId } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'
import { MAP_CONFIG } from '@/lib/map/leaflet-config'
import 'leaflet/dist/leaflet.css'

interface BaseMapProps {
  center?: LatLngExpression
  zoom?: number
  children?: React.ReactNode
  className?: string
  onMapReady?: (map: LeafletMap) => void
}

// Component to capture map instance and handle cleanup
function MapController({
  onMapReady,
  mapInstanceRef
}: {
  onMapReady?: (map: LeafletMap) => void
  mapInstanceRef: React.MutableRefObject<LeafletMap | null>
}) {
  const map = useMap()

  useEffect(() => {
    // Fix marker icons - do this inside useEffect
    const fixMarkerIcons = async () => {
      const L = await import('leaflet')
      delete (L.default.Icon.Default.prototype as any)._getIconUrl
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })
    }
    fixMarkerIcons()

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
  const mapId = useId()
  const [isMounted, setIsMounted] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const mapInstanceRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    setIsMounted(true)
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setMapReady(true), 50)
    return () => {
      clearTimeout(timer)
      setMapReady(false)
    }
  }, [])

  // Don't render until client-side to avoid SSR issues
  if (!isMounted || !mapReady) {
    return <div className={className} style={{ background: '#f0f0f0' }} />
  }

  return (
    <div className={className}>
      <MapContainer
        key={`base-map-${mapId}`}
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
