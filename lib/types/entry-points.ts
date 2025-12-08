/**
 * Entry Points Types for Web Platform
 * Defines types for location entry points (lối vào)
 */

/**
 * Entry point types - Classification of entry/access points
 */
export type EntryPointType =
  | 'main_gate'        // Cổng chính
  | 'side_gate'        // Cổng phụ
  | 'service_entrance' // Lối vào dịch vụ
  | 'emergency_exit'   // Lối thoát hiểm
  | 'pedestrian'       // Lối đi bộ
  | 'vehicle'          // Lối xe
  | 'other';           // Khác

/**
 * Compass directions for entry point facing
 */
export type CompassDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

/**
 * Entry Point - Represents a single access point to a location
 */
export interface EntryPoint {
  id: string;
  surveyLocationId?: string;
  sequenceNumber: number;

  // Coordinates
  latitude: number;
  longitude: number;
  elevation?: number | null;

  // Address specific to this entry point
  houseNumber?: string | null;
  street?: string | null;
  addressFull?: string | null;

  // Entry point metadata
  entryType: EntryPointType;
  isPrimary: boolean;
  facingDirection?: CompassDirection | null;
  notes?: string | null;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Database row type for survey_entry_points table
 */
export interface EntryPointRow {
  id: string;
  survey_location_id: string;
  sequence_number: number;
  latitude: number;
  longitude: number;
  elevation: number | null;
  house_number: string | null;
  street: string | null;
  address_full: string | null;
  entry_type: EntryPointType;
  is_primary: boolean;
  facing_direction: CompassDirection | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Labels for entry point types (Vietnamese)
 */
export const ENTRY_TYPE_LABELS: Record<EntryPointType, string> = {
  main_gate: 'Cổng chính',
  side_gate: 'Cổng phụ',
  service_entrance: 'Lối vào dịch vụ',
  emergency_exit: 'Lối thoát hiểm',
  pedestrian: 'Lối đi bộ',
  vehicle: 'Lối xe',
  other: 'Khác',
};

/**
 * Labels for compass directions (Vietnamese)
 */
export const DIRECTION_LABELS: Record<CompassDirection, string> = {
  N: 'Bắc',
  NE: 'Đông Bắc',
  E: 'Đông',
  SE: 'Đông Nam',
  S: 'Nam',
  SW: 'Tây Nam',
  W: 'Tây',
  NW: 'Tây Bắc',
};

/**
 * Convert database row to EntryPoint type
 */
export function rowToEntryPoint(row: EntryPointRow): EntryPoint {
  return {
    id: row.id,
    surveyLocationId: row.survey_location_id,
    sequenceNumber: row.sequence_number,
    latitude: row.latitude,
    longitude: row.longitude,
    elevation: row.elevation,
    houseNumber: row.house_number,
    street: row.street,
    addressFull: row.address_full,
    entryType: row.entry_type,
    isPrimary: row.is_primary,
    facingDirection: row.facing_direction,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert EntryPoint to database format
 */
export function entryPointToRow(ep: EntryPoint): Partial<EntryPointRow> {
  return {
    id: ep.id,
    survey_location_id: ep.surveyLocationId,
    sequence_number: ep.sequenceNumber,
    latitude: ep.latitude,
    longitude: ep.longitude,
    elevation: ep.elevation ?? null,
    house_number: ep.houseNumber ?? null,
    street: ep.street ?? null,
    address_full: ep.addressFull ?? null,
    entry_type: ep.entryType,
    is_primary: ep.isPrimary,
    facing_direction: ep.facingDirection ?? null,
    notes: ep.notes ?? null,
  };
}

/**
 * Get icon name for entry type (using Lucide icons)
 */
export function getEntryTypeIcon(type: EntryPointType): string {
  switch (type) {
    case 'main_gate':
      return 'door-open';
    case 'side_gate':
      return 'door-closed';
    case 'service_entrance':
      return 'truck';
    case 'emergency_exit':
      return 'alert-triangle';
    case 'pedestrian':
      return 'footprints';
    case 'vehicle':
      return 'car';
    default:
      return 'log-in';
  }
}

/**
 * Get color for entry point marker based on primary status
 */
export function getEntryPointColor(isPrimary: boolean): string {
  return isPrimary ? '#0f5132' : '#22c55e'; // primary green vs light green
}
