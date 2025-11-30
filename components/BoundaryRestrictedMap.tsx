'use client';

/**
 * BoundaryRestrictedMap Component for Web (Leaflet)
 *
 * A Leaflet map component that enforces location-based access control.
 * Features:
 * - Displays the officer's assigned ward boundary
 * - Grays out areas outside the boundary with an overlay
 * - Prevents marker placement outside the boundary
 * - Validates polygon drawings
 * - Supports leaflet-draw for polygon creation
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  GeoJSON,
} from 'react-leaflet';
import L, { LatLng, LatLngBounds, LeafletMouseEvent } from 'leaflet';
import { Polygon as GeoJSONPolygon, MultiPolygon, Position, Feature } from 'geojson';
import { useBoundaryStore } from '../store/boundaryStore';
import {
  isPointInsideBoundary,
  snapPointToBoundary,
  Point,
  ValidationResult,
  validateSurveyData,
  coordinatesToLatLngs,
  latLngsToCoordinates,
} from '../lib/spatialValidation';
import { AlertCircle, MapPin, Pencil, Check, X } from 'lucide-react';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix Leaflet default marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface BoundaryRestrictedMapProps {
  /** Initial center point */
  center?: { lat: number; lng: number };
  /** Initial zoom level */
  zoom?: number;
  /** Current survey marker position */
  marker?: { lat: number; lng: number } | null;
  /** Callback when marker position changes */
  onMarkerChange?: (position: { lat: number; lng: number }) => void;
  /** Survey polygon vertices */
  polygonVertices?: { lat: number; lng: number }[];
  /** Callback when polygon changes */
  onPolygonChange?: (vertices: { lat: number; lng: number }[]) => void;
  /** Whether drawing mode is active */
  isDrawingMode?: boolean;
  /** Callback for drawing mode change */
  onDrawingModeChange?: (isDrawing: boolean) => void;
  /** Allow placement outside boundary with warning */
  allowOutsideWithWarning?: boolean;
  /** Snap points to boundary if outside */
  snapToBoundary?: boolean;
  /** Show the assigned boundary */
  showBoundary?: boolean;
  /** Map height */
  height?: string | number;
  /** Callback when validation status changes */
  onValidationChange?: (result: ValidationResult) => void;
  /** Additional map class */
  className?: string;
  /** Read-only mode (no interactions) */
  readOnly?: boolean;
}

// Map event handler component
function MapEventHandler({
  onMapClick,
  isDrawingMode,
}: {
  onMapClick: (e: LeafletMouseEvent) => void;
  isDrawingMode: boolean;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    },
  });
  return null;
}

// Component to fit bounds
function FitBounds({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  return null;
}

// Gray overlay for areas outside boundary
function GrayOverlay({ boundaryCoords }: { boundaryCoords: [number, number][][] }) {
  // Create a large polygon covering the world with a hole for the boundary
  const worldBounds: [number, number][] = [
    [-90, -180],
    [-90, 180],
    [90, 180],
    [90, -180],
    [-90, -180],
  ];

  // Combine world bounds with reversed boundary (to create hole)
  const overlayCoords: [number, number][][] = [
    worldBounds,
    ...boundaryCoords.map(ring => [...ring].reverse() as [number, number][]),
  ];

  return (
    <Polygon
      positions={overlayCoords.map(ring => ring.map(([lat, lng]) => [lat, lng] as [number, number]))}
      pathOptions={{
        fillColor: '#808080',
        fillOpacity: 0.5,
        stroke: false,
      }}
    />
  );
}

const BoundaryRestrictedMap: React.FC<BoundaryRestrictedMapProps> = ({
  center,
  zoom = 15,
  marker,
  onMarkerChange,
  polygonVertices = [],
  onPolygonChange,
  isDrawingMode = false,
  onDrawingModeChange,
  allowOutsideWithWarning = false,
  snapToBoundary = true,
  showBoundary = true,
  height = '500px',
  onValidationChange,
  className = '',
  readOnly = false,
}) => {
  const markerRef = useRef<L.Marker>(null);

  // Get boundary from store
  const {
    boundaryGeometry,
    boundingBox,
    assignedBoundary,
    isLoading,
    error,
    canBypassBoundaryCheck,
    getBoundaryCenter,
  } = useBoundaryStore();

  // Local state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (center) return center;
    const boundaryCenter = getBoundaryCenter();
    return boundaryCenter || { lat: 10.8231, lng: 106.6297 }; // Default HCMC
  }, [center, getBoundaryCenter]);

  // Convert boundary to Leaflet format
  const boundaryLatLngs = useMemo((): [number, number][][] => {
    if (!boundaryGeometry) return [];

    const convertRing = (ring: Position[]): [number, number][] =>
      ring.map(([lng, lat]) => [lat, lng] as [number, number]);

    if (boundaryGeometry.type === 'Polygon') {
      return boundaryGeometry.coordinates.map(convertRing);
    } else if (boundaryGeometry.type === 'MultiPolygon') {
      return boundaryGeometry.coordinates.flatMap(polygon =>
        polygon.map(convertRing)
      );
    }

    return [];
  }, [boundaryGeometry]);

  // Calculate bounds for fitting
  const mapBounds = useMemo((): LatLngBounds | null => {
    if (!boundingBox) return null;

    return new L.LatLngBounds(
      [boundingBox.south, boundingBox.west],
      [boundingBox.north, boundingBox.east]
    );
  }, [boundingBox]);

  // Validate point
  const validatePoint = useCallback(
    (point: { lat: number; lng: number }): { isValid: boolean; snappedPoint: { lat: number; lng: number } } => {
      if (canBypassBoundaryCheck()) {
        return { isValid: true, snappedPoint: point };
      }

      if (!boundaryGeometry) {
        return { isValid: false, snappedPoint: point };
      }

      const isInside = isPointInsideBoundary(point, boundaryGeometry);

      if (isInside) {
        return { isValid: true, snappedPoint: point };
      }

      if (snapToBoundary) {
        const snapped = snapPointToBoundary(point, boundaryGeometry);
        return { isValid: false, snappedPoint: snapped };
      }

      return { isValid: false, snappedPoint: point };
    },
    [boundaryGeometry, canBypassBoundaryCheck, snapToBoundary]
  );

  // Handle map click
  const handleMapClick = useCallback(
    (e: LeafletMouseEvent) => {
      if (readOnly) return;

      const clickedPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      const { isValid, snappedPoint } = validatePoint(clickedPoint);

      if (isDrawingMode) {
        // Drawing polygon mode
        const pointToAdd = snapToBoundary && !isValid ? snappedPoint : clickedPoint;

        if (!isValid && !snapToBoundary) {
          setWarningMessage('Điểm này nằm ngoài khu vực được phân công');
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 3000);
          return;
        }

        onPolygonChange?.([...polygonVertices, pointToAdd]);
      } else {
        // Placing marker mode
        if (!isValid && !allowOutsideWithWarning) {
          if (snapToBoundary) {
            setWarningMessage('Vị trí đã được điều chỉnh vào trong khu vực được phân công');
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 3000);
            onMarkerChange?.(snappedPoint);
          } else {
            setWarningMessage('Vị trí này nằm ngoài khu vực bạn được phân công');
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 3000);
          }
          return;
        }

        if (!isValid && allowOutsideWithWarning) {
          setWarningMessage('Cảnh báo: Vị trí này nằm ngoài khu vực được phân công');
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 5000);
        }

        onMarkerChange?.(clickedPoint);
      }
    },
    [
      readOnly,
      validatePoint,
      isDrawingMode,
      snapToBoundary,
      allowOutsideWithWarning,
      polygonVertices,
      onPolygonChange,
      onMarkerChange,
    ]
  );

  // Handle marker drag
  const handleMarkerDrag = useCallback(() => {
    if (readOnly || !markerRef.current) return;

    const newPos = markerRef.current.getLatLng();
    const { isValid, snappedPoint } = validatePoint({ lat: newPos.lat, lng: newPos.lng });

    if (!isValid && snapToBoundary) {
      markerRef.current.setLatLng([snappedPoint.lat, snappedPoint.lng]);
      onMarkerChange?.(snappedPoint);
    } else {
      onMarkerChange?.({ lat: newPos.lat, lng: newPos.lng });
    }
  }, [readOnly, validatePoint, snapToBoundary, onMarkerChange]);

  // Validate survey data when it changes
  useEffect(() => {
    if (boundaryGeometry) {
      const surveyPolygon: Position[][] | null =
        polygonVertices.length >= 3
          ? [
              [
                ...polygonVertices.map(v => [v.lng, v.lat] as Position),
                [polygonVertices[0].lng, polygonVertices[0].lat] as Position,
              ],
            ]
          : null;

      const result = validateSurveyData(
        marker ? { lat: marker.lat, lng: marker.lng } : null,
        surveyPolygon,
        boundaryGeometry
      );

      setValidationResult(result);
      onValidationChange?.(result);
    }
  }, [marker, polygonVertices, boundaryGeometry, onValidationChange]);

  // Remove last polygon vertex
  const removeLastVertex = useCallback(() => {
    if (polygonVertices.length > 0) {
      onPolygonChange?.(polygonVertices.slice(0, -1));
    }
  }, [polygonVertices, onPolygonChange]);

  // Clear polygon
  const clearPolygon = useCallback(() => {
    onPolygonChange?.([]);
  }, [onPolygonChange]);

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-sm text-gray-600">Đang tải ranh giới khu vực...</span>
        </div>
      </div>
    );
  }

  if (error && !boundaryGeometry) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3 text-center p-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
          <button
            onClick={() => useBoundaryStore.getState().refreshBoundary()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fit to bounds on load */}
        <FitBounds bounds={mapBounds} />

        {/* Map click handler */}
        {!readOnly && (
          <MapEventHandler onMapClick={handleMapClick} isDrawingMode={isDrawingMode} />
        )}

        {/* Gray overlay outside boundary */}
        {showBoundary && boundaryLatLngs.length > 0 && (
          <GrayOverlay boundaryCoords={boundaryLatLngs} />
        )}

        {/* Boundary polygon */}
        {showBoundary &&
          boundaryLatLngs.map((coords, index) => (
            <Polygon
              key={`boundary-${index}`}
              positions={coords}
              pathOptions={{
                fillColor: '#0f5132',
                fillOpacity: 0.1,
                color: '#0f5132',
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{assignedBoundary?.name}</strong>
                  <br />
                  <span className="text-gray-500">
                    {assignedBoundary?.division_type}
                  </span>
                </div>
              </Popup>
            </Polygon>
          ))}

        {/* Survey marker */}
        {marker && (
          <Marker
            ref={markerRef}
            position={[marker.lat, marker.lng]}
            draggable={!readOnly}
            eventHandlers={{
              dragend: handleMarkerDrag,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>Vị trí khảo sát</strong>
                <br />
                <span className="text-gray-500">
                  {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Survey polygon */}
        {polygonVertices.length >= 3 && (
          <Polygon
            positions={polygonVertices.map(v => [v.lat, v.lng] as [number, number])}
            pathOptions={{
              fillColor: '#dc2626',
              fillOpacity: 0.2,
              color: '#dc2626',
              weight: 2,
            }}
          />
        )}

        {/* Polygon vertices */}
        {isDrawingMode &&
          polygonVertices.map((vertex, index) => (
            <Marker
              key={`vertex-${index}`}
              position={[vertex.lat, vertex.lng]}
              icon={L.divIcon({
                className: 'custom-vertex-marker',
                html: `<div class="w-6 h-6 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">${index + 1}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })}
            />
          ))}
      </MapContainer>

      {/* Drawing mode toolbar */}
      {isDrawingMode && !readOnly && (
        <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Chế độ vẽ: Chạm vào bản đồ để thêm điểm ({polygonVertices.length} điểm)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {polygonVertices.length > 0 && (
                <>
                  <button
                    onClick={removeLastVertex}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                    title="Xóa điểm cuối"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={clearPolygon}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    Xóa tất cả
                  </button>
                </>
              )}
              <button
                onClick={() => onDrawingModeChange?.(false)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded text-sm"
              >
                <Check className="h-4 w-4" />
                Hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning toast */}
      {showWarning && (
        <div className="absolute bottom-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 z-[1000] animate-in slide-in-from-bottom">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <span className="text-sm text-yellow-800">{warningMessage}</span>
          </div>
        </div>
      )}

      {/* Validation status */}
      {validationResult && !validationResult.isValid && !isDrawingMode && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 z-[1000]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-800">{validationResult.message}</span>
          </div>
        </div>
      )}

      {/* No boundary warning */}
      {showBoundary && !boundaryGeometry && !isLoading && (
        <div className="absolute top-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 z-[1000]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Chưa có ranh giới khu vực. Kiểm tra kết nối mạng.
            </span>
          </div>
        </div>
      )}

      {/* Map controls */}
      {!readOnly && !isDrawingMode && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[1000]">
          <button
            onClick={() => onDrawingModeChange?.(true)}
            className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
            title="Vẽ vùng khảo sát"
          >
            <Pencil className="h-5 w-5 text-gray-700" />
          </button>
          {marker && (
            <button
              onClick={() => onMarkerChange?.(undefined as any)}
              className="p-3 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
              title="Xóa điểm đánh dấu"
            >
              <MapPin className="h-5 w-5 text-red-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BoundaryRestrictedMap;
