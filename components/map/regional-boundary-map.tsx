'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import L from 'leaflet'
import { MAP_CONFIG } from '@/lib/map/leaflet-config'
import { getUserBoundary, getBoundaryMaskGeometry, BoundaryContext } from '@/lib/security/boundary-enforcement'
import 'leaflet/dist/leaflet.css'

interface RegionalBoundaryMapProps {
  boundaryContext: BoundaryContext
  center?: [number, number]
  zoom?: number
  showBoundaryMask?: boolean
  children?: React.ReactNode
}

/**
 * Component to handle map bounds and boundary mask
 */
function BoundaryController({
  boundaryContext,
  showBoundaryMask = true
}: {
  boundaryContext: BoundaryContext
  showBoundaryMask: boolean
}) {
  const map = useMap()
  const [maskGeometry, setMaskGeometry] = useState<any>(null)

  useEffect(() => {
    const allowedBounds = getUserBoundary(boundaryContext)

    if (allowedBounds) {
      // Set max bounds to restrict panning
      map.setMaxBounds(allowedBounds)

      // Fit the map to the allowed bounds
      map.fitBounds(allowedBounds, { padding: [20, 20] })

      // Generate mask geometry if enabled
      if (showBoundaryMask) {
        const mask = getBoundaryMaskGeometry(boundaryContext)
        setMaskGeometry(mask)
      }
    }
  }, [map, boundaryContext, showBoundaryMask])

  return maskGeometry ? (
    <GeoJSON
      data={maskGeometry}
      style={{
        fillColor: '#000000',
        fillOpacity: 0.35,
        color: '#ff0000',
        weight: 2,
        interactive: false
      }}
    />
  ) : null
}

/**
 * Regional Boundary Map Component
 * Shows a map with administrative boundary enforcement
 * Areas outside user's jurisdiction are grayed out and non-interactive
 */
export function RegionalBoundaryMap({
  boundaryContext,
  center,
  zoom = 13,
  showBoundaryMask = true,
  children
}: RegionalBoundaryMapProps) {
  const allowedBounds = getUserBoundary(boundaryContext)

  // Determine initial center
  const mapCenter = center || (allowedBounds ?
    [allowedBounds.getCenter().lat, allowedBounds.getCenter().lng] as [number, number] :
    MAP_CONFIG.DEFAULT_CENTER as [number, number])

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      className="h-full w-full"
      minZoom={MAP_CONFIG.MIN_ZOOM}
      maxZoom={MAP_CONFIG.MAX_ZOOM}
      zoomControl={true}
    >
      <TileLayer
        attribution={MAP_CONFIG.TILE_LAYERS.openStreetMap.attribution}
        url={MAP_CONFIG.TILE_LAYERS.openStreetMap.url}
        maxZoom={MAP_CONFIG.MAX_ZOOM}
      />

      <BoundaryController
        boundaryContext={boundaryContext}
        showBoundaryMask={showBoundaryMask}
      />

      {children}
    </MapContainer>
  )
}
