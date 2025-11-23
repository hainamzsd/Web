'use client'

import { Marker, Popup, Circle } from 'react-leaflet'
import { LatLngExpression, Icon } from 'leaflet'
import { MAP_CONFIG } from '@/lib/map/leaflet-config'

interface LocationMarkerProps {
  position: LatLngExpression
  status: string
  accuracy?: number
  title?: string
  address?: string
  onClick?: () => void
}

export function LocationMarker({
  position,
  status,
  accuracy,
  title,
  address,
  onClick
}: LocationMarkerProps) {
  const markerColor = MAP_CONFIG.MARKER_COLORS[status as keyof typeof MAP_CONFIG.MARKER_COLORS] || '#gray'

  // Create custom colored marker using SVG data URL
  const customIcon = new Icon({
    iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${encodeURIComponent(markerColor)}' width='32' height='32'%3E%3Cpath d='M12 0C7.802 0 4 3.403 4 7.602C4 11.8 7.469 16.812 12 24C16.531 16.812 20 11.8 20 7.602C20 3.403 16.199 0 12 0M12 11C10.343 11 9 9.657 9 8C9 6.343 10.343 5 12 5C13.657 5 15 6.343 15 8C15 9.657 13.657 11 12 11Z'/%3E%3C/svg%3E`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })

  return (
    <>
      <Marker
        position={position}
        icon={customIcon}
        eventHandlers={{
          click: onClick
        }}
      >
        <Popup>
          <div className="p-2">
            <h3 className="font-semibold text-sm">{title || 'Vị trí khảo sát'}</h3>
            {address && <p className="text-xs text-gray-600 mt-1">{address}</p>}
            <div className="mt-2 text-xs">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium`}
                style={{ backgroundColor: markerColor + '20', color: markerColor }}>
                {status}
              </span>
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Accuracy circle if provided */}
      {accuracy && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{
            fillColor: markerColor,
            fillOpacity: 0.1,
            color: markerColor,
            weight: 1
          }}
        />
      )}
    </>
  )
}
