'use client';

/**
 * Location Access Context for Web Platform
 *
 * Manages the officer's assigned location (province_code, ward_code) and
 * provides boundary enforcement for the web interface. Integrates with
 * Supabase RLS and provides client-side validation.
 *
 * Features:
 * - Loads assigned location from user profile
 * - Fetches boundary geometry for visual enforcement
 * - Provides validation functions
 * - Province-level user support
 * - Admin bypass
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { Polygon, MultiPolygon } from 'geojson';

// =============================================================================
// TYPES
// =============================================================================

export type ScopeLevel = 'ward' | 'province' | 'admin';

export interface AssignedLocation {
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  scopeLevel: ScopeLevel;
}

export interface BoundaryGeometry {
  type: 'Feature';
  properties: {
    code: number;
    name: string;
    level: string;
  };
  geometry: Polygon | MultiPolygon;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  warning?: boolean;
}

export interface LocationAccessContextType {
  // State
  assignedLocation: AssignedLocation | null;
  boundaryGeometry: BoundaryGeometry | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFromProfile: (profile: {
    province_code?: string;
    district_code?: string;
    ward_code?: string;
    role?: string;
  }) => Promise<void>;
  fetchBoundary: () => Promise<void>;
  validateGPSPoint: (lat: number, lng: number) => Promise<ValidationResult>;
  validatePolygon: (coordinates: [number, number][]) => ValidationResult;
  canAccessWard: (wardCode: string) => boolean;
  canAccessProvince: (provinceCode: string) => boolean;
  getAutoFillCodes: () => {
    province_code: string;
    district_code: string;
    ward_code: string;
  } | null;
  clear: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const LocationAccessContext = createContext<LocationAccessContextType | null>(null);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Ray casting algorithm for point-in-polygon
 */
function pointInPolygonRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if point is in polygon
 */
function isPointInPolygon(
  lng: number,
  lat: number,
  geometry: Polygon | MultiPolygon
): boolean {
  if (geometry.type === 'Polygon') {
    if (!pointInPolygonRing(lng, lat, geometry.coordinates[0])) {
      return false;
    }
    for (let i = 1; i < geometry.coordinates.length; i++) {
      if (pointInPolygonRing(lng, lat, geometry.coordinates[i])) {
        return false;
      }
    }
    return true;
  }

  if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (pointInPolygonRing(lng, lat, polygon[0])) {
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInPolygonRing(lng, lat, polygon[i])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }

  return false;
}

// =============================================================================
// PROVIDER
// =============================================================================

interface LocationAccessProviderProps {
  children: ReactNode;
  initialProfile?: {
    province_code?: string;
    district_code?: string;
    ward_code?: string;
    role?: string;
  };
}

export function LocationAccessProvider({
  children,
  initialProfile,
}: LocationAccessProviderProps) {
  const supabase = createClient();

  const [assignedLocation, setAssignedLocation] = useState<AssignedLocation | null>(null);
  const [boundaryGeometry, setBoundaryGeometry] = useState<BoundaryGeometry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load location from profile
  const loadFromProfile = useCallback(
    async (profile: {
      province_code?: string;
      district_code?: string;
      ward_code?: string;
      role?: string;
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        const { province_code, district_code, ward_code, role } = profile;

        if (!province_code) {
          throw new Error('Tài khoản chưa được phân công khu vực');
        }

        // Determine scope level
        let scopeLevel: ScopeLevel = 'ward';
        if (role === 'admin') {
          scopeLevel = 'admin';
        } else if (role === 'leader' && !ward_code) {
          scopeLevel = 'province';
        }

        // Fetch location names from API
        let provinceName = `Tỉnh ${province_code}`;
        let districtName = district_code ? `Huyện ${district_code}` : '';
        let wardName = ward_code ? `Xã ${ward_code}` : '';

        try {
          // Try to get names from provinces API
          const response = await fetch(
            `https://provinces.open-api.vn/api/p/${province_code}?depth=2`
          );
          if (response.ok) {
            const data = await response.json();
            provinceName = data.name;

            if (district_code && data.districts) {
              const district = data.districts.find(
                (d: { code: number }) => d.code.toString() === district_code
              );
              if (district) {
                districtName = district.name;

                if (ward_code && district.wards) {
                  const ward = district.wards.find(
                    (w: { code: number }) => w.code.toString() === ward_code
                  );
                  if (ward) {
                    wardName = ward.name;
                  }
                }
              }
            }
          }
        } catch {
          // Use fallback names
        }

        const location: AssignedLocation = {
          provinceCode: province_code,
          provinceName,
          districtCode: district_code || '',
          districtName,
          wardCode: ward_code || '',
          wardName,
          scopeLevel,
        };

        setAssignedLocation(location);
        setIsLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Lỗi tải thông tin khu vực';
        setError(message);
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch boundary geometry
  const fetchBoundary = useCallback(async () => {
    if (!assignedLocation) return;

    // Admin doesn't need boundary
    if (assignedLocation.scopeLevel === 'admin') {
      setBoundaryGeometry(null);
      return;
    }

    try {
      // Try to fetch from Supabase RPC
      const { data, error } = await supabase.rpc('get_user_assigned_boundary');

      if (!error && data?.boundary) {
        setBoundaryGeometry(data.boundary);
        return;
      }

      // Fallback: Try localStorage
      const localKey =
        assignedLocation.scopeLevel === 'province'
          ? `local_boundary_province_${assignedLocation.provinceCode}`
          : `local_boundary_${assignedLocation.wardCode}`;

      const localData = localStorage.getItem(localKey);
      if (localData) {
        setBoundaryGeometry(JSON.parse(localData));
        return;
      }

      setBoundaryGeometry(null);
    } catch (err) {
      console.error('Failed to fetch boundary:', err);
      setBoundaryGeometry(null);
    }
  }, [assignedLocation, supabase]);

  // Validate GPS point
  const validateGPSPoint = useCallback(
    async (lat: number, lng: number): Promise<ValidationResult> => {
      // Admin can access anywhere
      if (!assignedLocation || assignedLocation.scopeLevel === 'admin') {
        return {
          isValid: true,
          message: 'Quản trị viên có quyền truy cập mọi khu vực',
        };
      }

      // If no boundary geometry, try server-side validation
      if (!boundaryGeometry) {
        try {
          const { data, error } = await supabase.rpc('validate_gps_within_ward', {
            lat,
            lng,
          });

          if (error) {
            return {
              isValid: true,
              message: 'Chưa có dữ liệu ranh giới, cho phép tạm thời',
              warning: true,
            };
          }

          return {
            isValid: data.isValid,
            message: data.message,
            warning: data.warning,
          };
        } catch {
          return {
            isValid: true,
            message: 'Không thể xác thực vị trí, cho phép tạm thời',
            warning: true,
          };
        }
      }

      // Check bounding box first
      if (boundaryGeometry.bounds) {
        const { north, south, east, west } = boundaryGeometry.bounds;
        if (lat < south || lat > north || lng < west || lng > east) {
          return {
            isValid: false,
            message: `Vị trí nằm ngoài khu vực ${assignedLocation.wardName || assignedLocation.wardCode}`,
          };
        }
      }

      // Detailed polygon check
      if (boundaryGeometry.geometry) {
        if (!isPointInPolygon(lng, lat, boundaryGeometry.geometry)) {
          return {
            isValid: false,
            message: `Vị trí nằm ngoài khu vực ${assignedLocation.wardName || assignedLocation.wardCode}`,
          };
        }
      }

      return {
        isValid: true,
        message: `Vị trí nằm trong khu vực ${assignedLocation.wardName || assignedLocation.wardCode}`,
      };
    },
    [assignedLocation, boundaryGeometry, supabase]
  );

  // Validate polygon
  const validatePolygon = useCallback(
    (coordinates: [number, number][]): ValidationResult => {
      // Admin can access anywhere
      if (!assignedLocation || assignedLocation.scopeLevel === 'admin') {
        return {
          isValid: true,
          message: 'Quản trị viên có quyền truy cập mọi khu vực',
        };
      }

      // If no boundary, allow with warning
      if (!boundaryGeometry?.geometry) {
        return {
          isValid: true,
          message: 'Chưa có dữ liệu ranh giới, cho phép tạm thời',
          warning: true,
        };
      }

      // Check all vertices
      const outsidePoints: [number, number][] = [];

      for (const [lat, lng] of coordinates) {
        if (!isPointInPolygon(lng, lat, boundaryGeometry.geometry)) {
          outsidePoints.push([lat, lng]);
        }
      }

      if (outsidePoints.length > 0) {
        return {
          isValid: false,
          message: `${outsidePoints.length} điểm nằm ngoài khu vực được phân công`,
        };
      }

      return {
        isValid: true,
        message: `Vùng khảo sát nằm trong khu vực ${assignedLocation.wardName || assignedLocation.wardCode}`,
      };
    },
    [assignedLocation, boundaryGeometry]
  );

  // Check ward access
  const canAccessWard = useCallback(
    (wardCode: string): boolean => {
      if (!assignedLocation) return false;

      if (assignedLocation.scopeLevel === 'admin') return true;

      if (assignedLocation.scopeLevel === 'province') {
        return wardCode.startsWith(assignedLocation.provinceCode);
      }

      return wardCode === assignedLocation.wardCode;
    },
    [assignedLocation]
  );

  // Check province access
  const canAccessProvince = useCallback(
    (provinceCode: string): boolean => {
      if (!assignedLocation) return false;

      if (assignedLocation.scopeLevel === 'admin') return true;

      return provinceCode === assignedLocation.provinceCode;
    },
    [assignedLocation]
  );

  // Get auto-fill codes
  const getAutoFillCodes = useCallback(() => {
    if (!assignedLocation) return null;

    return {
      province_code: assignedLocation.provinceCode,
      district_code: assignedLocation.districtCode,
      ward_code: assignedLocation.wardCode,
    };
  }, [assignedLocation]);

  // Clear state
  const clear = useCallback(() => {
    setAssignedLocation(null);
    setBoundaryGeometry(null);
    setIsLoading(false);
    setError(null);
  }, []);

  // Load initial profile
  useEffect(() => {
    if (initialProfile) {
      loadFromProfile(initialProfile);
    }
  }, [initialProfile, loadFromProfile]);

  // Fetch boundary when location changes
  useEffect(() => {
    if (assignedLocation) {
      fetchBoundary();
    }
  }, [assignedLocation, fetchBoundary]);

  const value: LocationAccessContextType = {
    assignedLocation,
    boundaryGeometry,
    isLoading,
    error,
    loadFromProfile,
    fetchBoundary,
    validateGPSPoint,
    validatePolygon,
    canAccessWard,
    canAccessProvince,
    getAutoFillCodes,
    clear,
  };

  return (
    <LocationAccessContext.Provider value={value}>
      {children}
    </LocationAccessContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useLocationAccess(): LocationAccessContextType {
  const context = useContext(LocationAccessContext);

  if (!context) {
    throw new Error('useLocationAccess must be used within a LocationAccessProvider');
  }

  return context;
}

export default LocationAccessContext;
