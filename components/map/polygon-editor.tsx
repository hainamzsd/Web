'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { checkPolygonWithinBoundary, BoundaryContext } from '@/lib/security/boundary-enforcement'

interface PolygonEditorProps {
  boundaryContext: BoundaryContext
  initialPolygon?: [number, number][]
  onPolygonChange?: (coordinates: [number, number][]) => void
  onValidationError?: (message: string) => void
  editable?: boolean
}

/**
 * Polygon Editor Component
 * Allows users to draw/edit polygons with boundary validation
 */
export function PolygonEditor({
  boundaryContext,
  initialPolygon,
  onPolygonChange,
  onValidationError,
  editable = true
}: PolygonEditorProps) {
  const map = useMap()
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup())
  const drawControlRef = useRef<L.Control.Draw | null>(null)

  useEffect(() => {
    if (!editable) return

    const drawnItems = drawnItemsRef.current
    map.addLayer(drawnItems)

    // Load initial polygon if provided
    if (initialPolygon && initialPolygon.length > 0) {
      const polygon = L.polygon(initialPolygon, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2
      })
      drawnItems.addLayer(polygon)
    }

    // Setup draw control
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#ef4444',
            timeout: 2500
          },
          shapeOptions: {
            color: '#3b82f6',
            fillOpacity: 0.2
          }
        },
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            fillOpacity: 0.2
          }
        }
      }
    })

    map.addControl(drawControl)
    drawControlRef.current = drawControl

    // Handle polygon creation
    const handleDrawCreated = (e: any) => {
      const layer = e.layer
      const coordinates = layer.getLatLngs()[0].map((latlng: L.LatLng) => [
        latlng.lat,
        latlng.lng
      ]) as [number, number][]

      // Validate polygon is within boundary
      const validation = checkPolygonWithinBoundary(coordinates, boundaryContext)

      if (!validation.isWithinBounds) {
        if (onValidationError) {
          onValidationError(validation.message || 'Polygon is outside allowed boundary')
        }
        // Don't add the layer
        return
      }

      // Clear existing polygons (only allow one at a time)
      drawnItems.clearLayers()
      drawnItems.addLayer(layer)

      if (onPolygonChange) {
        onPolygonChange(coordinates)
      }
    }

    // Handle polygon editing
    const handleDrawEdited = (e: any) => {
      const layers = e.layers
      layers.eachLayer((layer: any) => {
        const coordinates = layer.getLatLngs()[0].map((latlng: L.LatLng) => [
          latlng.lat,
          latlng.lng
        ]) as [number, number][]

        // Validate edited polygon
        const validation = checkPolygonWithinBoundary(coordinates, boundaryContext)

        if (!validation.isWithinBounds) {
          if (onValidationError) {
            onValidationError(validation.message || 'Polygon is outside allowed boundary')
          }
          // Revert the edit by removing and re-adding original
          // In production, you'd want to cache the original coordinates
          return
        }

        if (onPolygonChange) {
          onPolygonChange(coordinates)
        }
      })
    }

    // Handle polygon deletion
    const handleDrawDeleted = () => {
      if (onPolygonChange) {
        onPolygonChange([])
      }
    }

    map.on(L.Draw.Event.CREATED, handleDrawCreated)
    map.on(L.Draw.Event.EDITED, handleDrawEdited)
    map.on(L.Draw.Event.DELETED, handleDrawDeleted)

    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated)
      map.off(L.Draw.Event.EDITED, handleDrawEdited)
      map.off(L.Draw.Event.DELETED, handleDrawDeleted)
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
    }
  }, [map, boundaryContext, editable, onPolygonChange, onValidationError])

  return null
}
