'use client';

/**
 * Boundary Overlay Component for Web Map
 *
 * Displays the officer's assigned ward/province boundary on the Leaflet map.
 * Areas outside the boundary are grayed out with a semi-transparent mask.
 *
 * Features:
 * - Shows boundary polygon with customizable styling
 * - Grays out areas outside the boundary
 * - Restricts map interaction to within boundary (optional)
 * - Shows boundary name tooltip
 */

import React, { useMemo } from 'react';
import { Polygon, Polyline, useMap, Tooltip } from 'react-leaflet';
import { LatLngBoundsLiteral, LatLngExpression } from 'leaflet';
import { useLocationAccess } from '@/lib/auth/location-access-context';

// =============================================================================
// TYPES
// =============================================================================

interface BoundaryOverlayProps {
  /**
   * Whether to show the boundary outline
   */
  showBoundary?: boolean;

  /**
   * Whether to show the mask overlay
   */
  showMask?: boolean;

  /**
   * Fill color for the boundary
   */
  fillColor?: string;

  /**
   * Fill opacity for the boundary
   */
  fillOpacity?: number;

  /**
   * Stroke color for the boundary
   */
  strokeColor?: string;

  /**
   * Stroke weight
   */
  strokeWeight?: number;

  /**
   * Mask color
   */
  maskColor?: string;

  /**
   * Mask opacity
   */
  maskOpacity?: number;

  /**
   * Whether to restrict map bounds to boundary
   */
  restrictMapBounds?: boolean;

  /**
   * Whether to show boundary name tooltip
   */
  showTooltip?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Vietnam bounding box for mask
const VIETNAM_BOUNDS: LatLngBoundsLiteral = [
  [8.0, 102.0],
  [23.5, 110.0],
];

// =============================================================================
// HELPER COMPONENT
// =============================================================================

function MapBoundsRestrictor({ bounds }: { bounds: LatLngBoundsLiteral }) {
  const map = useMap();

  React.useEffect(() => {
    map.setMaxBounds(bounds);
    map.fitBounds(bounds, { padding: [20, 20] });

    return () => {
      // Reset max bounds on unmount
      map.setMaxBounds(VIETNAM_BOUNDS);
    };
  }, [map, bounds]);

  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BoundaryOverlay({
  showBoundary = true,
  showMask = true,
  fillColor = '#0f5132',
  fillOpacity = 0.1,
  strokeColor = '#0f5132',
  strokeWeight = 3,
  maskColor = '#000000',
  maskOpacity = 0.3,
  restrictMapBounds = false,
  showTooltip = true,
}: BoundaryOverlayProps) {
  const { boundaryGeometry, assignedLocation, isLoading } = useLocationAccess();

  // Convert GeoJSON coordinates to Leaflet format
  const boundaryCoordinates = useMemo(() => {
    if (!boundaryGeometry?.geometry) return null;

    const { geometry } = boundaryGeometry;

    const convertRing = (ring: number[][]): LatLngExpression[] => {
      return ring.map(([lng, lat]) => [lat, lng] as LatLngExpression);
    };

    if (geometry.type === 'Polygon') {
      return {
        outer: convertRing(geometry.coordinates[0]),
        holes: geometry.coordinates.slice(1).map(convertRing),
      };
    }

    if (geometry.type === 'MultiPolygon') {
      // For simplicity, use the first polygon
      const firstPolygon = geometry.coordinates[0];
      return {
        outer: convertRing(firstPolygon[0]),
        holes: firstPolygon.slice(1).map(convertRing),
      };
    }

    return null;
  }, [boundaryGeometry]);

  // Create mask polygon (Vietnam bounds with hole for boundary)
  const maskCoordinates = useMemo(() => {
    if (!boundaryCoordinates) return null;

    // Vietnam outer ring (counter-clockwise for outer boundary)
    const vietnamRing: LatLngExpression[] = [
      [23.5, 102.0],
      [23.5, 110.0],
      [8.0, 110.0],
      [8.0, 102.0],
      [23.5, 102.0],
    ];

    return {
      outer: vietnamRing,
      hole: boundaryCoordinates.outer,
    };
  }, [boundaryCoordinates]);

  // Calculate bounds for map restriction
  const mapBounds = useMemo<LatLngBoundsLiteral | null>(() => {
    if (!boundaryGeometry?.bounds) return null;

    const { north, south, east, west } = boundaryGeometry.bounds;
    return [
      [south, west],
      [north, east],
    ];
  }, [boundaryGeometry]);

  // Don't render for admin users or if loading
  if (!assignedLocation || assignedLocation.scopeLevel === 'admin') {
    return null;
  }

  if (isLoading || !boundaryCoordinates) {
    return null;
  }

  return (
    <>
      {/* Map bounds restrictor */}
      {restrictMapBounds && mapBounds && <MapBoundsRestrictor bounds={mapBounds} />}

      {/* Mask layer */}
      {showMask && maskCoordinates && (
        <Polygon
          positions={[maskCoordinates.outer, maskCoordinates.hole]}
          pathOptions={{
            color: 'transparent',
            fillColor: maskColor,
            fillOpacity: maskOpacity,
            interactive: false,
          }}
        />
      )}

      {/* Boundary polygon */}
      {showBoundary && (
        <>
          <Polygon
            positions={[boundaryCoordinates.outer, ...boundaryCoordinates.holes]}
            pathOptions={{
              color: strokeColor,
              weight: strokeWeight,
              fillColor: fillColor,
              fillOpacity: fillOpacity,
              dashArray: '5, 5',
            }}
          >
            {showTooltip && (
              <Tooltip permanent direction="center" className="boundary-tooltip">
                {assignedLocation.wardName || assignedLocation.wardCode}
              </Tooltip>
            )}
          </Polygon>

          {/* Solid boundary outline */}
          <Polyline
            positions={boundaryCoordinates.outer}
            pathOptions={{
              color: strokeColor,
              weight: strokeWeight,
              opacity: 1,
            }}
          />
        </>
      )}
    </>
  );
}

// =============================================================================
// BOUNDARY WARNING COMPONENT
// =============================================================================

interface BoundaryWarningProps {
  className?: string;
}

export function BoundaryWarning({ className }: BoundaryWarningProps) {
  const { boundaryGeometry, assignedLocation, isLoading } = useLocationAccess();

  if (!assignedLocation || assignedLocation.scopeLevel === 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className={`bg-gray-100 border border-gray-300 rounded-lg p-3 flex items-center gap-2 ${className}`}
      >
        <div className="animate-pulse w-4 h-4 bg-gray-300 rounded-full" />
        <span className="text-gray-600 text-sm">Đang tải ranh giới...</span>
      </div>
    );
  }

  if (!boundaryGeometry) {
    return (
      <div
        className={`bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-center gap-2 ${className}`}
      >
        <span className="text-yellow-600">⚠️</span>
        <span className="text-yellow-800 text-sm">
          Chưa có dữ liệu ranh giới khu vực được phân công
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-green-50 border border-green-300 rounded-lg p-3 flex items-center gap-2 ${className}`}
    >
      <span className="text-green-600">🔒</span>
      <span className="text-green-800 text-sm">
        Khu vực làm việc: <strong>{assignedLocation.wardName || assignedLocation.wardCode}</strong>
      </span>
    </div>
  );
}

export default BoundaryOverlay;
