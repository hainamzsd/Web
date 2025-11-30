/**
 * Spatial Validation Utilities for Web
 *
 * TypeScript implementations for spatial validation.
 * These functions check if points/polygons are within boundary polygons.
 */

import { Polygon, MultiPolygon, Position, Feature, Point as GeoJSONPoint } from 'geojson';

export interface Point {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: {
    pointsOutside?: Point[];
    percentageInside?: number;
  };
}

/**
 * Ray casting algorithm for point-in-polygon
 */
export function pointInPolygonRing(point: Position, polygon: Position[]): boolean {
  const x = point[0]; // longitude
  const y = point[1]; // latitude

  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if point is in Polygon (handles holes)
 */
export function pointInPolygon(point: Position, polygon: Polygon): boolean {
  if (!pointInPolygonRing(point, polygon.coordinates[0])) {
    return false;
  }

  // Check not in holes
  for (let i = 1; i < polygon.coordinates.length; i++) {
    if (pointInPolygonRing(point, polygon.coordinates[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Check if point is in MultiPolygon
 */
export function pointInMultiPolygon(point: Position, multiPolygon: MultiPolygon): boolean {
  for (const polygonCoords of multiPolygon.coordinates) {
    const polygon: Polygon = { type: 'Polygon', coordinates: polygonCoords };
    if (pointInPolygon(point, polygon)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if point is inside boundary
 */
export function isPointInsideBoundary(
  point: Point,
  boundary: Polygon | MultiPolygon
): boolean {
  const position: Position = [point.lng, point.lat];

  if (boundary.type === 'Polygon') {
    return pointInPolygon(position, boundary);
  } else if (boundary.type === 'MultiPolygon') {
    return pointInMultiPolygon(position, boundary);
  }

  return false;
}

/**
 * Validate all polygon vertices are inside boundary
 */
export function isPolygonInsideBoundary(
  polygon: Position[][],
  boundary: Polygon | MultiPolygon
): ValidationResult {
  const outerRing = polygon[0];
  const pointsOutside: Point[] = [];

  for (const position of outerRing) {
    const point: Point = { lng: position[0], lat: position[1] };
    if (!isPointInsideBoundary(point, boundary)) {
      pointsOutside.push(point);
    }
  }

  if (pointsOutside.length === 0) {
    return {
      isValid: true,
      message: 'Vùng khảo sát nằm trong khu vực được phân công',
    };
  }

  const percentageInside =
    ((outerRing.length - pointsOutside.length) / outerRing.length) * 100;

  return {
    isValid: false,
    message: `${pointsOutside.length} điểm nằm ngoài khu vực được phân công`,
    details: { pointsOutside, percentageInside },
  };
}

/**
 * Validate GPS point against boundary
 */
export function validateGPSPoint(
  point: Point,
  boundary: Polygon | MultiPolygon | null
): ValidationResult {
  if (!boundary) {
    return {
      isValid: false,
      message: 'Chưa tải được ranh giới khu vực được phân công',
    };
  }

  if (isPointInsideBoundary(point, boundary)) {
    return {
      isValid: true,
      message: 'Vị trí nằm trong khu vực được phân công',
    };
  }

  return {
    isValid: false,
    message: 'Vị trí nằm ngoài khu vực được phân công',
  };
}

/**
 * Validate survey polygon against boundary
 */
export function validateSurveyPolygon(
  surveyPolygon: Position[][],
  boundary: Polygon | MultiPolygon | null
): ValidationResult {
  if (!boundary) {
    return {
      isValid: false,
      message: 'Chưa tải được ranh giới khu vực được phân công',
    };
  }

  return isPolygonInsideBoundary(surveyPolygon, boundary);
}

/**
 * Calculate bounding box
 */
export function calculateBoundingBox(coordinates: Position[][]): BoundingBox {
  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;

  for (const ring of coordinates) {
    for (const [lng, lat] of ring) {
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    }
  }

  return { north, south, east, west };
}

/**
 * Check if point is in bounding box
 */
export function isPointInBoundingBox(point: Point, box: BoundingBox): boolean {
  return (
    point.lat >= box.south &&
    point.lat <= box.north &&
    point.lng >= box.west &&
    point.lng <= box.east
  );
}

/**
 * Snap point to nearest boundary edge if outside
 */
export function snapPointToBoundary(
  point: Point,
  boundary: Polygon | MultiPolygon
): Point {
  if (isPointInsideBoundary(point, boundary)) {
    return point;
  }

  const boundaryCoords =
    boundary.type === 'Polygon'
      ? boundary.coordinates[0]
      : boundary.coordinates[0][0];

  let nearestPoint = { ...point };
  let minDistance = Infinity;

  for (let i = 0; i < boundaryCoords.length - 1; i++) {
    const segmentStart = boundaryCoords[i];
    const segmentEnd = boundaryCoords[i + 1];

    const nearest = nearestPointOnSegment(
      point,
      { lng: segmentStart[0], lat: segmentStart[1] },
      { lng: segmentEnd[0], lat: segmentEnd[1] }
    );

    const distance = haversineDistance(point, nearest);
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = nearest;
    }
  }

  return nearestPoint;
}

/**
 * Find nearest point on line segment
 */
function nearestPointOnSegment(point: Point, segStart: Point, segEnd: Point): Point {
  const dx = segEnd.lng - segStart.lng;
  const dy = segEnd.lat - segStart.lat;

  if (dx === 0 && dy === 0) return segStart;

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - segStart.lng) * dx + (point.lat - segStart.lat) * dy) /
        (dx * dx + dy * dy)
    )
  );

  return {
    lng: segStart.lng + t * dx,
    lat: segStart.lat + t * dy,
  };
}

/**
 * Haversine distance in meters
 */
export function haversineDistance(point1: Point, point2: Point): number {
  const R = 6371000;
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate polygon area in square meters
 */
export function calculatePolygonArea(coordinates: Position[][]): number {
  const outerRing = coordinates[0];
  let area = 0;

  for (let i = 0; i < outerRing.length - 1; i++) {
    const [lng1, lat1] = outerRing[i];
    const [lng2, lat2] = outerRing[i + 1];

    area +=
      ((lng2 - lng1) * Math.PI) / 180 *
      (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }

  const R = 6371000;
  area = (Math.abs(area) * R * R) / 2;

  // Subtract holes
  for (let h = 1; h < coordinates.length; h++) {
    const hole = coordinates[h];
    let holeArea = 0;

    for (let i = 0; i < hole.length - 1; i++) {
      const [lng1, lat1] = hole[i];
      const [lng2, lat2] = hole[i + 1];

      holeArea +=
        ((lng2 - lng1) * Math.PI) / 180 *
        (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
    }

    area -= (Math.abs(holeArea) * R * R) / 2;
  }

  return area;
}

/**
 * Comprehensive survey data validation
 */
export function validateSurveyData(
  gpsPoint: Point | null,
  surveyPolygon: Position[][] | null,
  boundary: Polygon | MultiPolygon | null,
  options: { requirePolygon?: boolean; allowPartialOverlap?: boolean } = {}
): ValidationResult {
  const { requirePolygon = false, allowPartialOverlap = false } = options;

  if (!boundary) {
    return {
      isValid: false,
      message: 'Chưa tải được ranh giới khu vực được phân công',
    };
  }

  if (gpsPoint) {
    const pointResult = validateGPSPoint(gpsPoint, boundary);
    if (!pointResult.isValid) return pointResult;
  }

  if (surveyPolygon) {
    const polygonResult = validateSurveyPolygon(surveyPolygon, boundary);

    if (!polygonResult.isValid) {
      if (
        allowPartialOverlap &&
        polygonResult.details?.percentageInside &&
        polygonResult.details.percentageInside >= 90
      ) {
        return {
          isValid: true,
          message: 'Vùng khảo sát phần lớn nằm trong khu vực được phân công',
          details: polygonResult.details,
        };
      }
      return polygonResult;
    }
  } else if (requirePolygon) {
    return {
      isValid: false,
      message: 'Cần vẽ ranh giới vùng khảo sát',
    };
  }

  return {
    isValid: true,
    message: 'Dữ liệu khảo sát hợp lệ',
  };
}

/**
 * Convert Leaflet LatLng array to GeoJSON coordinates
 */
export function latLngsToCoordinates(latLngs: { lat: number; lng: number }[]): Position[] {
  return latLngs.map(ll => [ll.lng, ll.lat]);
}

/**
 * Convert GeoJSON coordinates to Leaflet LatLng array
 */
export function coordinatesToLatLngs(coordinates: Position[]): { lat: number; lng: number }[] {
  return coordinates.map(([lng, lat]) => ({ lat, lng }));
}
