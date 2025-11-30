/**
 * Location Access Middleware
 *
 * Server-side middleware for enforcing location-based access control
 * in Next.js API routes. Validates that users can only access surveys
 * within their assigned province/ward.
 *
 * Features:
 * - Validates user's location scope from session
 * - Checks survey location against user's assigned area
 * - Province-level access for leaders
 * - Admin bypass
 * - Error responses in Vietnamese
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// TYPES
// =============================================================================

export type ScopeLevel = 'ward' | 'province' | 'admin';

export interface UserLocationScope {
  userId: string;
  role: string;
  provinceCode: string | null;
  districtCode: string | null;
  wardCode: string | null;
  scopeLevel: ScopeLevel;
}

export interface LocationAccessResult {
  allowed: boolean;
  message: string;
  userScope?: UserLocationScope;
}

export interface SurveyLocation {
  province_code: string;
  district_code?: string;
  ward_code: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get user's location scope from their profile
 */
export async function getUserLocationScope(): Promise<UserLocationScope | null> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, province_code, district_code, ward_code')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Determine scope level
  let scopeLevel: ScopeLevel = 'ward';
  if (profile.role === 'admin') {
    scopeLevel = 'admin';
  } else if (profile.role === 'leader' && !profile.ward_code) {
    scopeLevel = 'province';
  }

  return {
    userId: user.id,
    role: profile.role,
    provinceCode: profile.province_code,
    districtCode: profile.district_code,
    wardCode: profile.ward_code,
    scopeLevel,
  };
}

/**
 * Check if user can access a specific survey location
 */
export function canAccessSurveyLocation(
  userScope: UserLocationScope,
  surveyLocation: SurveyLocation
): LocationAccessResult {
  // Admin can access everything
  if (userScope.scopeLevel === 'admin') {
    return {
      allowed: true,
      message: 'Quản trị viên có quyền truy cập mọi khu vực',
      userScope,
    };
  }

  // Check province match
  if (surveyLocation.province_code !== userScope.provinceCode) {
    return {
      allowed: false,
      message: 'Khảo sát nằm ngoài tỉnh/thành phố bạn được phân công',
      userScope,
    };
  }

  // Province-level users can access all wards in their province
  if (userScope.scopeLevel === 'province') {
    return {
      allowed: true,
      message: 'Khảo sát nằm trong tỉnh/thành phố bạn được phân công',
      userScope,
    };
  }

  // Ward-level users can only access their own ward
  if (surveyLocation.ward_code !== userScope.wardCode) {
    return {
      allowed: false,
      message: 'Khảo sát nằm ngoài xã/phường bạn được phân công',
      userScope,
    };
  }

  return {
    allowed: true,
    message: 'Khảo sát nằm trong khu vực bạn được phân công',
    userScope,
  };
}

/**
 * Check if user can access a specific ward
 */
export function canAccessWard(
  userScope: UserLocationScope,
  wardCode: string
): boolean {
  if (userScope.scopeLevel === 'admin') return true;

  if (userScope.scopeLevel === 'province') {
    // Ward codes in Vietnam typically contain the province code prefix
    // This is a simplified check - adjust based on your code format
    return true; // Province-level can access all wards in province
  }

  return wardCode === userScope.wardCode;
}

/**
 * Check if user can access a specific province
 */
export function canAccessProvince(
  userScope: UserLocationScope,
  provinceCode: string
): boolean {
  if (userScope.scopeLevel === 'admin') return true;
  return provinceCode === userScope.provinceCode;
}

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Middleware to validate location access for API routes
 * Returns NextResponse if access denied, null if allowed
 */
export async function validateLocationAccess(
  request: NextRequest,
  surveyLocation?: SurveyLocation
): Promise<NextResponse | null> {
  const userScope = await getUserLocationScope();

  if (!userScope) {
    return NextResponse.json(
      { error: 'Không có quyền truy cập. Vui lòng đăng nhập lại.' },
      { status: 401 }
    );
  }

  // If no specific survey location provided, just check authentication
  if (!surveyLocation) {
    return null; // Allow access
  }

  const accessResult = canAccessSurveyLocation(userScope, surveyLocation);

  if (!accessResult.allowed) {
    return NextResponse.json(
      {
        error: accessResult.message,
        code: 'LOCATION_ACCESS_DENIED',
        userScope: {
          provinceCode: userScope.provinceCode,
          wardCode: userScope.wardCode,
          scopeLevel: userScope.scopeLevel,
        },
      },
      { status: 403 }
    );
  }

  return null; // Allow access
}

/**
 * Validate and get user scope for survey operations
 */
export async function validateAndGetScope(): Promise<{
  userScope: UserLocationScope;
} | NextResponse> {
  const userScope = await getUserLocationScope();

  if (!userScope) {
    return NextResponse.json(
      { error: 'Không có quyền truy cập. Vui lòng đăng nhập lại.' },
      { status: 401 }
    );
  }

  if (!userScope.provinceCode) {
    return NextResponse.json(
      { error: 'Tài khoản chưa được phân công khu vực làm việc.' },
      { status: 403 }
    );
  }

  return { userScope };
}

/**
 * Build Supabase query filters based on user's location scope
 */
export function buildLocationFilter(userScope: UserLocationScope): {
  province_code?: string;
  ward_code?: string;
} {
  // Admin sees everything
  if (userScope.scopeLevel === 'admin') {
    return {};
  }

  // Province-level sees all in their province
  if (userScope.scopeLevel === 'province') {
    return {
      province_code: userScope.provinceCode!,
    };
  }

  // Ward-level sees only their ward
  return {
    province_code: userScope.provinceCode!,
    ward_code: userScope.wardCode!,
  };
}

/**
 * Enforce location codes on survey data
 * Prevents clients from spoofing location codes
 */
export function enforceLocationCodes(
  surveyData: Record<string, unknown>,
  userScope: UserLocationScope
): Record<string, unknown> {
  // Admin can set any codes
  if (userScope.scopeLevel === 'admin') {
    return surveyData;
  }

  // Force user's assigned location codes
  return {
    ...surveyData,
    province_code: userScope.provinceCode,
    district_code: userScope.districtCode,
    ward_code: userScope.wardCode,
  };
}

// =============================================================================
// API ROUTE HELPERS
// =============================================================================

/**
 * Wrapper for GET routes that require location-based filtering
 */
export async function withLocationFilter<T>(
  handler: (userScope: UserLocationScope, filters: Record<string, string>) => Promise<T>
): Promise<T | NextResponse> {
  const result = await validateAndGetScope();

  if (result instanceof NextResponse) {
    return result;
  }

  const filters = buildLocationFilter(result.userScope);
  return handler(result.userScope, filters);
}

/**
 * Wrapper for POST/PUT routes that require location enforcement
 */
export async function withLocationEnforcement<T>(
  surveyData: Record<string, unknown>,
  handler: (
    userScope: UserLocationScope,
    enforcedData: Record<string, unknown>
  ) => Promise<T>
): Promise<T | NextResponse> {
  const result = await validateAndGetScope();

  if (result instanceof NextResponse) {
    return result;
  }

  const enforcedData = enforceLocationCodes(surveyData, result.userScope);
  return handler(result.userScope, enforcedData);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  getUserLocationScope,
  canAccessSurveyLocation,
  canAccessWard,
  canAccessProvince,
  validateLocationAccess,
  validateAndGetScope,
  buildLocationFilter,
  enforceLocationCodes,
  withLocationFilter,
  withLocationEnforcement,
};
