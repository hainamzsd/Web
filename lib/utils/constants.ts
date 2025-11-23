// Survey status values
export const SURVEY_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  APPROVED_COMMUNE: 'approved_commune',
  REJECTED: 'rejected',
  APPROVED_CENTRAL: 'approved_central',
  PUBLISHED: 'published',
} as const;

export type SurveyStatus = typeof SURVEY_STATUS[keyof typeof SURVEY_STATUS];

// Type guard for survey status
export function isSurveyStatus(status: string): status is SurveyStatus {
  return Object.values(SURVEY_STATUS).includes(status as SurveyStatus);
}

// User roles
export const USER_ROLES = {
  COMMUNE_OFFICER: 'commune_officer',
  COMMUNE_SUPERVISOR: 'commune_supervisor',
  CENTRAL_ADMIN: 'central_admin',
  SYSTEM_ADMIN: 'system_admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Approval actions
export const APPROVAL_ACTIONS = {
  SUBMITTED: 'submitted',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
} as const;

export type ApprovalAction = typeof APPROVAL_ACTIONS[keyof typeof APPROVAL_ACTIONS];

// Object types
export const OBJECT_TYPES = [
  'house',
  'apartment',
  'factory',
  'warehouse',
  'office',
  'school',
  'hospital',
  'religious',
  'land_plot',
  'other',
] as const;

export type ObjectType = typeof OBJECT_TYPES[number];

// Land use types
export const LAND_USE_TYPES = [
  'residential',
  'commercial',
  'industrial',
  'agricultural',
  'public',
  'religious',
  'transport',
  'other',
] as const;

export type LandUseType = typeof LAND_USE_TYPES[number];

// Status badge colors
export const STATUS_COLORS: Record<SurveyStatus, string> = {
  [SURVEY_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [SURVEY_STATUS.REVIEWED]: 'bg-blue-100 text-blue-800',
  [SURVEY_STATUS.APPROVED_COMMUNE]: 'bg-green-100 text-green-800',
  [SURVEY_STATUS.REJECTED]: 'bg-red-100 text-red-800',
  [SURVEY_STATUS.APPROVED_CENTRAL]: 'bg-emerald-100 text-emerald-800',
  [SURVEY_STATUS.PUBLISHED]: 'bg-purple-100 text-purple-800',
};

// Status labels (Vietnamese)
export const STATUS_LABELS: Record<SurveyStatus, string> = {
  [SURVEY_STATUS.PENDING]: 'Chờ xử lý',
  [SURVEY_STATUS.REVIEWED]: 'Đã xem xét',
  [SURVEY_STATUS.APPROVED_COMMUNE]: 'Xã đã duyệt',
  [SURVEY_STATUS.REJECTED]: 'Từ chối',
  [SURVEY_STATUS.APPROVED_CENTRAL]: 'Trung ương đã duyệt',
  [SURVEY_STATUS.PUBLISHED]: 'Đã công bố',
};

// Map configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [16.0544, 108.2022] as [number, number], // Vietnam center
  DEFAULT_ZOOM: 6,
  MAX_ZOOM: 20,
  MIN_ZOOM: 5,
  TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_LAYER_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};
