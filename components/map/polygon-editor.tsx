'use client'

import { useEffect, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import { checkPolygonWithinBoundary, BoundaryContext } from '@/lib/security/boundary-enforcement'
import 'leaflet-draw/dist/leaflet.draw.css'

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
  const drawnItemsRef = useRef<any>(null)
  const drawControlRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!editable) return

    let mounted = true

    const initPolygonEditor = async () => {
      const L = await import('leaflet')
      await import('leaflet-draw')

      if (!mounted) return

      const drawnItems = new L.default.FeatureGroup()
      drawnItemsRef.current = drawnItems
      map.addLayer(drawnItems)

      // Load initial polygon if provided
      if (initialPolygon && initialPolygon.length > 0) {
        const polygon = L.default.polygon(initialPolygon, {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2
        })
        drawnItems.addLayer(polygon)
      }

      // Setup draw control
      const drawControl = new (L.default.Control as any).Draw({
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
        const coordinates = layer.getLatLngs()[0].map((latlng: any) => [
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
          const coordinates = layer.getLatLngs()[0].map((latlng: any) => [
            latlng.lat,
            latlng.lng
          ]) as [number, number][]

          // Validate edited polygon
          const validation = checkPolygonWithinBoundary(coordinates, boundaryContext)

          if (!validation.isWithinBounds) {
            if (onValidationError) {
              onValidationError(validation.message || 'Polygon is outside allowed boundary')
            }
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

      map.on((L.default as any).Draw.Event.CREATED, handleDrawCreated)
      map.on((L.default as any).Draw.Event.EDITED, handleDrawEdited)
      map.on((L.default as any).Draw.Event.DELETED, handleDrawDeleted)

      setIsReady(true)
    }

    initPolygonEditor()

    return () => {
      mounted = false
      if (drawControlRef.current) {
        try {
          map.removeControl(drawControlRef.current)
        } catch (e) {}
      }
      if (drawnItemsRef.current) {
        try {
          map.removeLayer(drawnItemsRef.current)
        } catch (e) {}
      }
    }
  }, [map, boundaryContext, editable])

  return null
}
