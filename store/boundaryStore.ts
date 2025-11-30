/**
 * Boundary Store for Web
 *
 * Zustand store for managing officer's assigned boundary data.
 */

import { create } from 'zustand';
import { Polygon, MultiPolygon } from 'geojson';
import {
  WardBoundary,
  fetchWardBoundary,
  getBoundaryCenter,
  clearBoundaryCache,
} from '../lib/boundaryService';
import {
  BoundingBox,
  calculateBoundingBox,
  isPointInsideBoundary,
  Point,
} from '../lib/spatialValidation';

interface BoundaryState {
  // Current officer's assigned boundary
  assignedBoundary: WardBoundary | null;
  boundaryGeometry: Polygon | MultiPolygon | null;
  boundingBox: BoundingBox | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Officer's assignment info
  assignedWardCode: number | null;
  assignedDistrictCode: number | null;
  assignedProvinceCode: number | null;

  // User role (for bypass logic)
  userRole: 'officer' | 'leader' | 'admin' | null;

  // Actions
  loadBoundary: (
    wardCode: number,
    districtCode: number,
    provinceCode: number
  ) => Promise<void>;
  setUserRole: (role: 'officer' | 'leader' | 'admin') => void;
  clearBoundary: () => void;
  refreshBoundary: () => Promise<void>;

  // Validation helpers
  isPointInBoundary: (point: Point) => boolean;
  canBypassBoundaryCheck: () => boolean;
  getBoundaryCenter: () => { lat: number; lng: number } | null;
}

export const useBoundaryStore = create<BoundaryState>((set, get) => ({
  assignedBoundary: null,
  boundaryGeometry: null,
  boundingBox: null,
  isLoading: false,
  error: null,
  assignedWardCode: null,
  assignedDistrictCode: null,
  assignedProvinceCode: null,
  userRole: null,

  loadBoundary: async (
    wardCode: number,
    districtCode: number,
    provinceCode: number
  ) => {
    set({
      isLoading: true,
      error: null,
      assignedWardCode: wardCode,
      assignedDistrictCode: districtCode,
      assignedProvinceCode: provinceCode,
    });

    try {
      const boundary = await fetchWardBoundary(wardCode, districtCode, provinceCode);

      if (!boundary) {
        set({
          isLoading: false,
          error: 'Không thể tải ranh giới khu vực. Vui lòng thử lại sau.',
        });
        return;
      }

      let boundingBox: BoundingBox | null = null;
      if (boundary.geometry) {
        const coords =
          boundary.geometry.type === 'Polygon'
            ? boundary.geometry.coordinates
            : boundary.geometry.coordinates[0];
        boundingBox = calculateBoundingBox(coords);
      } else if (boundary.bounds) {
        boundingBox = {
          north: boundary.bounds.north,
          south: boundary.bounds.south,
          east: boundary.bounds.east,
          west: boundary.bounds.west,
        };
      }

      set({
        assignedBoundary: boundary,
        boundaryGeometry: boundary.geometry,
        boundingBox,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      set({
        isLoading: false,
        error: `Không thể tải ranh giới: ${message}`,
      });
    }
  },

  setUserRole: (role: 'officer' | 'leader' | 'admin') => {
    set({ userRole: role });
  },

  clearBoundary: () => {
    set({
      assignedBoundary: null,
      boundaryGeometry: null,
      boundingBox: null,
      assignedWardCode: null,
      assignedDistrictCode: null,
      assignedProvinceCode: null,
      error: null,
    });
  },

  refreshBoundary: async () => {
    const { assignedWardCode, assignedDistrictCode, assignedProvinceCode } = get();

    if (!assignedWardCode || !assignedDistrictCode || !assignedProvinceCode) {
      set({ error: 'Chưa có thông tin khu vực được phân công' });
      return;
    }

    clearBoundaryCache();

    await get().loadBoundary(
      assignedWardCode,
      assignedDistrictCode,
      assignedProvinceCode
    );
  },

  isPointInBoundary: (point: Point): boolean => {
    const { boundaryGeometry, userRole } = get();

    if (userRole === 'admin') return true;

    if (!boundaryGeometry) return false;

    return isPointInsideBoundary(point, boundaryGeometry);
  },

  canBypassBoundaryCheck: (): boolean => {
    const { userRole } = get();
    return userRole === 'admin';
  },

  getBoundaryCenter: (): { lat: number; lng: number } | null => {
    const { assignedBoundary, boundingBox } = get();

    if (assignedBoundary) {
      return getBoundaryCenter(assignedBoundary);
    }

    if (boundingBox) {
      return {
        lat: (boundingBox.north + boundingBox.south) / 2,
        lng: (boundingBox.east + boundingBox.west) / 2,
      };
    }

    // Default to Vietnam center
    return { lat: 16.0544, lng: 108.2022 };
  },
}));

/**
 * Initialize boundary on login
 */
export async function initializeBoundary(profile: {
  wardCode: string;
  districtCode: string;
  provinceCode: string;
  role: 'officer' | 'leader' | 'admin';
}): Promise<void> {
  const store = useBoundaryStore.getState();
  store.setUserRole(profile.role);

  await store.loadBoundary(
    parseInt(profile.wardCode, 10),
    parseInt(profile.districtCode, 10),
    parseInt(profile.provinceCode, 10)
  );
}
