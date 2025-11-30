/**
 * Boundary Service for Web
 *
 * Fetches and caches administrative boundary data from provinces.open-api.vn
 * Provides GeoJSON polygons for ward/commune boundaries used for access control.
 */

import { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';

// Cache keys
const BOUNDARY_CACHE_PREFIX = 'boundary_cache_';
const BOUNDARY_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// API endpoints
const PROVINCES_API_BASE = 'https://provinces.open-api.vn/api';

/**
 * Ward boundary data with GeoJSON geometry
 */
export interface WardBoundary {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  district_code: number;
  province_code: number;
  geometry: Polygon | MultiPolygon | null;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * District information
 */
export interface DistrictInfo {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  province_code: number;
  wards: WardInfo[];
}

/**
 * Ward info without geometry
 */
export interface WardInfo {
  code: number;
  name: string;
  codename: string;
  division_type: string;
}

/**
 * Province information
 */
export interface ProvinceInfo {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  phone_code: number;
  districts: DistrictInfo[];
}

/**
 * Cached boundary data
 */
interface CachedBoundary {
  boundary: WardBoundary;
  timestamp: number;
}

/**
 * Get cache key for a ward boundary
 */
function getCacheKey(wardCode: number): string {
  return `${BOUNDARY_CACHE_PREFIX}${wardCode}`;
}

/**
 * Fetch provinces from API
 */
export async function fetchProvinces(): Promise<ProvinceInfo[]> {
  try {
    const response = await fetch(`${PROVINCES_API_BASE}/p/`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch provinces:', error);
    throw new Error('Không thể tải danh sách tỉnh/thành phố');
  }
}

/**
 * Fetch districts for a province
 */
export async function fetchDistricts(provinceCode: number): Promise<DistrictInfo[]> {
  try {
    const response = await fetch(`${PROVINCES_API_BASE}/p/${provinceCode}?depth=2`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const province: ProvinceInfo = await response.json();
    return province.districts || [];
  } catch (error) {
    console.error('Failed to fetch districts:', error);
    throw new Error('Không thể tải danh sách quận/huyện');
  }
}

/**
 * Fetch wards for a district
 */
export async function fetchWards(districtCode: number): Promise<WardInfo[]> {
  try {
    const response = await fetch(`${PROVINCES_API_BASE}/d/${districtCode}?depth=2`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const district: DistrictInfo = await response.json();
    return district.wards || [];
  } catch (error) {
    console.error('Failed to fetch wards:', error);
    throw new Error('Không thể tải danh sách phường/xã');
  }
}

/**
 * Calculate bounding box from geometry
 */
function calculateBounds(geometry: Polygon | MultiPolygon): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  const processCoordinates = (coords: number[][]) => {
    for (const [lng, lat] of coords) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  };

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => processCoordinates(ring));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => processCoordinates(ring));
    });
  }

  return { north: maxLat, south: minLat, east: maxLng, west: minLng };
}

/**
 * Fetch ward boundary from cache or API
 */
export async function fetchWardBoundary(
  wardCode: number,
  districtCode: number,
  provinceCode: number
): Promise<WardBoundary | null> {
  try {
    // Check localStorage cache
    const cached = getCachedBoundary(wardCode);
    if (cached) return cached;

    // Fetch ward info
    const response = await fetch(`${PROVINCES_API_BASE}/w/${wardCode}`);
    if (!response.ok) {
      console.error(`Ward API error: ${response.status}`);
      return null;
    }

    const wardData = await response.json();

    const boundary: WardBoundary = {
      code: wardData.code,
      name: wardData.name,
      codename: wardData.codename || '',
      division_type: wardData.division_type || 'xã',
      district_code: districtCode,
      province_code: provinceCode,
      geometry: null,
    };

    // Try to fetch geometry from your boundary API
    const geometryResult = await fetchWardGeometry(wardCode);
    if (geometryResult) {
      boundary.geometry = geometryResult.geometry;
      boundary.bounds = geometryResult.bounds;
    }

    // Cache the result
    cacheBoundary(wardCode, boundary);

    return boundary;
  } catch (error) {
    console.error('Failed to fetch ward boundary:', error);
    return null;
  }
}

/**
 * Fetch ward geometry from boundary API or static file
 */
async function fetchWardGeometry(wardCode: number): Promise<{
  geometry: Polygon | MultiPolygon;
  bounds: { north: number; south: number; east: number; west: number };
} | null> {
  try {
    // Option 1: Fetch from your own boundary API endpoint
    const boundaryApiUrl = process.env.NEXT_PUBLIC_BOUNDARY_API_URL;
    if (boundaryApiUrl) {
      const response = await fetch(`${boundaryApiUrl}/api/boundaries/ward/${wardCode}`);
      if (response.ok) {
        const data = await response.json();
        return {
          geometry: data.geometry,
          bounds: data.bounds || calculateBounds(data.geometry),
        };
      }
    }

    // Option 2: Load from local storage (pre-populated)
    const stored = localStorage.getItem(`local_boundary_${wardCode}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        geometry: parsed.geometry,
        bounds: parsed.bounds || calculateBounds(parsed.geometry),
      };
    }

    return null;
  } catch (error) {
    console.warn('Could not fetch ward geometry:', error);
    return null;
  }
}

/**
 * Get cached boundary from localStorage
 */
function getCachedBoundary(wardCode: number): WardBoundary | null {
  try {
    if (typeof window === 'undefined') return null;

    const cacheKey = getCacheKey(wardCode);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const data: CachedBoundary = JSON.parse(cached);

    // Check expiry
    if (Date.now() - data.timestamp > BOUNDARY_CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data.boundary;
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

/**
 * Cache boundary in localStorage
 */
function cacheBoundary(wardCode: number, boundary: WardBoundary): void {
  try {
    if (typeof window === 'undefined') return;

    const cacheKey = getCacheKey(wardCode);
    const cacheData: CachedBoundary = {
      boundary,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

/**
 * Store ward boundary geometry locally
 */
export function storeWardBoundary(
  wardCode: number,
  geometry: Polygon | MultiPolygon
): void {
  try {
    if (typeof window === 'undefined') return;

    const bounds = calculateBounds(geometry);
    localStorage.setItem(
      `local_boundary_${wardCode}`,
      JSON.stringify({ geometry, bounds })
    );

    // Clear cache to refresh
    localStorage.removeItem(getCacheKey(wardCode));
  } catch (error) {
    console.error('Failed to store ward boundary:', error);
  }
}

/**
 * Convert boundary to GeoJSON Feature
 */
export function boundaryToGeoJSON(
  boundary: WardBoundary
): Feature<Polygon | MultiPolygon> | null {
  if (!boundary.geometry) return null;

  return {
    type: 'Feature',
    properties: {
      code: boundary.code,
      name: boundary.name,
      codename: boundary.codename,
      division_type: boundary.division_type,
      district_code: boundary.district_code,
      province_code: boundary.province_code,
    },
    geometry: boundary.geometry,
  };
}

/**
 * Create FeatureCollection from boundaries
 */
export function boundariesToFeatureCollection(
  boundaries: WardBoundary[]
): FeatureCollection<Polygon | MultiPolygon> {
  const features = boundaries
    .map(b => boundaryToGeoJSON(b))
    .filter((f): f is Feature<Polygon | MultiPolygon> => f !== null);

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Clear all cached boundary data
 */
export function clearBoundaryCache(): void {
  try {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage);
    keys
      .filter(k => k.startsWith(BOUNDARY_CACHE_PREFIX) || k.startsWith('local_boundary_'))
      .forEach(k => localStorage.removeItem(k));
  } catch (error) {
    console.error('Failed to clear boundary cache:', error);
  }
}

/**
 * Get center of boundary
 */
export function getBoundaryCenter(boundary: WardBoundary): {
  lat: number;
  lng: number;
} | null {
  if (!boundary.bounds) return null;

  return {
    lat: (boundary.bounds.north + boundary.bounds.south) / 2,
    lng: (boundary.bounds.east + boundary.bounds.west) / 2,
  };
}
