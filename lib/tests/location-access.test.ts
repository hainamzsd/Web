/**
 * Location Access Control Test Utilities
 *
 * Test functions and scenarios for validating the location-based
 * access control implementation.
 *
 * Usage:
 * - Import these functions in your test files
 * - Run with Jest or similar test runner
 * - Use the scenarios for manual testing
 */

import {
  isPointInsideBoundary,
  isPolygonInsideBoundary,
  validateGPSPoint,
  validateSurveyPolygon,
  validateSurveyData,
  haversineDistance,
  calculatePolygonArea,
} from '@/lib/spatialValidation';

import {
  canAccessSurveyLocation,
  canAccessWard,
  canAccessProvince,
  buildLocationFilter,
  enforceLocationCodes,
  UserLocationScope,
} from '@/lib/middleware/location-access-middleware';

import { Polygon, MultiPolygon, Position } from 'geojson';

// =============================================================================
// TEST DATA
// =============================================================================

/**
 * Sample ward boundary (simplified rectangle for testing)
 * Represents a ward in southern Vietnam (approx. Ba Ria area)
 */
export const SAMPLE_WARD_BOUNDARY: Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [107.1634, 10.4958], // Southwest
      [107.1834, 10.4958], // Southeast
      [107.1834, 10.5158], // Northeast
      [107.1634, 10.5158], // Northwest
      [107.1634, 10.4958], // Close polygon
    ],
  ],
};

/**
 * Point inside the sample ward boundary
 */
export const POINT_INSIDE: { lat: number; lng: number } = {
  lat: 10.5058,
  lng: 107.1734,
};

/**
 * Point outside the sample ward boundary
 */
export const POINT_OUTSIDE: { lat: number; lng: number } = {
  lat: 10.5500,
  lng: 107.2000,
};

/**
 * Sample user scopes for testing
 */
export const TEST_USER_SCOPES = {
  wardOfficer: {
    userId: 'user-1',
    role: 'officer',
    provinceCode: '79',
    districtCode: '795',
    wardCode: '26560',
    scopeLevel: 'ward' as const,
  },
  provinceLeader: {
    userId: 'user-2',
    role: 'leader',
    provinceCode: '79',
    districtCode: null,
    wardCode: null,
    scopeLevel: 'province' as const,
  },
  admin: {
    userId: 'user-3',
    role: 'admin',
    provinceCode: null,
    districtCode: null,
    wardCode: null,
    scopeLevel: 'admin' as const,
  },
};

/**
 * Sample survey locations for testing
 */
export const TEST_SURVEY_LOCATIONS = {
  sameWard: {
    province_code: '79',
    district_code: '795',
    ward_code: '26560',
  },
  differentWard: {
    province_code: '79',
    district_code: '795',
    ward_code: '26561',
  },
  differentProvince: {
    province_code: '77',
    district_code: '760',
    ward_code: '25000',
  },
};

// =============================================================================
// SPATIAL VALIDATION TESTS
// =============================================================================

export function testPointInPolygon() {
  console.log('=== Point in Polygon Tests ===');

  // Test point inside
  const insideResult = isPointInsideBoundary(POINT_INSIDE, SAMPLE_WARD_BOUNDARY);
  console.log(`Point inside boundary: ${insideResult} (expected: true)`);

  // Test point outside
  const outsideResult = isPointInsideBoundary(POINT_OUTSIDE, SAMPLE_WARD_BOUNDARY);
  console.log(`Point outside boundary: ${outsideResult} (expected: false)`);

  return insideResult === true && outsideResult === false;
}

export function testPolygonValidation() {
  console.log('\n=== Polygon Validation Tests ===');

  // Polygon inside boundary
  const polygonInside: Position[][] = [
    [
      [107.1684, 10.5008],
      [107.1784, 10.5008],
      [107.1784, 10.5108],
      [107.1684, 10.5108],
      [107.1684, 10.5008],
    ],
  ];

  const insideResult = isPolygonInsideBoundary(polygonInside, SAMPLE_WARD_BOUNDARY);
  console.log(`Polygon inside boundary: ${insideResult.isValid} (expected: true)`);

  // Polygon partially outside
  const polygonPartiallyOutside: Position[][] = [
    [
      [107.1684, 10.5008],
      [107.1900, 10.5008], // Outside
      [107.1900, 10.5108],
      [107.1684, 10.5108],
      [107.1684, 10.5008],
    ],
  ];

  const outsideResult = isPolygonInsideBoundary(polygonPartiallyOutside, SAMPLE_WARD_BOUNDARY);
  console.log(`Polygon partially outside: ${outsideResult.isValid} (expected: false)`);
  console.log(`Points outside: ${outsideResult.details?.pointsOutside?.length || 0}`);

  return insideResult.isValid === true && outsideResult.isValid === false;
}

export function testGPSValidation() {
  console.log('\n=== GPS Validation Tests ===');

  // Valid GPS
  const validResult = validateGPSPoint(POINT_INSIDE, SAMPLE_WARD_BOUNDARY);
  console.log(`Valid GPS: ${validResult.isValid} - ${validResult.message}`);

  // Invalid GPS
  const invalidResult = validateGPSPoint(POINT_OUTSIDE, SAMPLE_WARD_BOUNDARY);
  console.log(`Invalid GPS: ${invalidResult.isValid} - ${invalidResult.message}`);

  // No boundary
  const noBoundaryResult = validateGPSPoint(POINT_INSIDE, null);
  console.log(`No boundary: ${noBoundaryResult.isValid} - ${noBoundaryResult.message}`);

  return (
    validResult.isValid === true &&
    invalidResult.isValid === false &&
    noBoundaryResult.isValid === false
  );
}

export function testComprehensiveValidation() {
  console.log('\n=== Comprehensive Survey Validation Tests ===');

  // Valid survey data
  const validData = validateSurveyData(
    POINT_INSIDE,
    null,
    SAMPLE_WARD_BOUNDARY
  );
  console.log(`Valid survey: ${validData.isValid} - ${validData.message}`);

  // Invalid GPS
  const invalidGPS = validateSurveyData(
    POINT_OUTSIDE,
    null,
    SAMPLE_WARD_BOUNDARY
  );
  console.log(`Invalid GPS: ${invalidGPS.isValid} - ${invalidGPS.message}`);

  // No boundary
  const noBoundary = validateSurveyData(POINT_INSIDE, null, null);
  console.log(`No boundary: ${noBoundary.isValid} - ${noBoundary.message}`);

  return validData.isValid === true && invalidGPS.isValid === false;
}

// =============================================================================
// ACCESS CONTROL TESTS
// =============================================================================

export function testWardOfficerAccess() {
  console.log('\n=== Ward Officer Access Tests ===');
  const userScope = TEST_USER_SCOPES.wardOfficer;

  // Same ward - should allow
  const sameWard = canAccessSurveyLocation(userScope, TEST_SURVEY_LOCATIONS.sameWard);
  console.log(`Same ward access: ${sameWard.allowed} (expected: true)`);

  // Different ward - should deny
  const differentWard = canAccessSurveyLocation(
    userScope,
    TEST_SURVEY_LOCATIONS.differentWard
  );
  console.log(`Different ward access: ${differentWard.allowed} (expected: false)`);

  // Different province - should deny
  const differentProvince = canAccessSurveyLocation(
    userScope,
    TEST_SURVEY_LOCATIONS.differentProvince
  );
  console.log(`Different province access: ${differentProvince.allowed} (expected: false)`);

  return (
    sameWard.allowed === true &&
    differentWard.allowed === false &&
    differentProvince.allowed === false
  );
}

export function testProvinceLeaderAccess() {
  console.log('\n=== Province Leader Access Tests ===');
  const userScope = TEST_USER_SCOPES.provinceLeader;

  // Same ward - should allow
  const sameWard = canAccessSurveyLocation(userScope, TEST_SURVEY_LOCATIONS.sameWard);
  console.log(`Same ward access: ${sameWard.allowed} (expected: true)`);

  // Different ward in same province - should allow
  const differentWard = canAccessSurveyLocation(
    userScope,
    TEST_SURVEY_LOCATIONS.differentWard
  );
  console.log(`Different ward (same province) access: ${differentWard.allowed} (expected: true)`);

  // Different province - should deny
  const differentProvince = canAccessSurveyLocation(
    userScope,
    TEST_SURVEY_LOCATIONS.differentProvince
  );
  console.log(`Different province access: ${differentProvince.allowed} (expected: false)`);

  return (
    sameWard.allowed === true &&
    differentWard.allowed === true &&
    differentProvince.allowed === false
  );
}

export function testAdminAccess() {
  console.log('\n=== Admin Access Tests ===');
  const userScope = TEST_USER_SCOPES.admin;

  // Same ward - should allow
  const sameWard = canAccessSurveyLocation(userScope, TEST_SURVEY_LOCATIONS.sameWard);
  console.log(`Same ward access: ${sameWard.allowed} (expected: true)`);

  // Different ward - should allow
  const differentWard = canAccessSurveyLocation(
    userScope,
    TEST_SURVEY_LOCATIONS.differentWard
  );
  console.log(`Different ward access: ${differentWard.allowed} (expected: true)`);

  // Different province - should allow
  const differentProvince = canAccessSurveyLocation(
    userScope,
    TEST_SURVEY_LOCATIONS.differentProvince
  );
  console.log(`Different province access: ${differentProvince.allowed} (expected: true)`);

  return (
    sameWard.allowed === true &&
    differentWard.allowed === true &&
    differentProvince.allowed === true
  );
}

export function testLocationFilter() {
  console.log('\n=== Location Filter Tests ===');

  // Ward officer - should filter by province and ward
  const wardFilter = buildLocationFilter(TEST_USER_SCOPES.wardOfficer);
  console.log('Ward officer filter:', wardFilter);

  // Province leader - should filter by province only
  const provinceFilter = buildLocationFilter(TEST_USER_SCOPES.provinceLeader);
  console.log('Province leader filter:', provinceFilter);

  // Admin - no filter
  const adminFilter = buildLocationFilter(TEST_USER_SCOPES.admin);
  console.log('Admin filter:', adminFilter);

  return (
    wardFilter.province_code === '79' &&
    wardFilter.ward_code === '26560' &&
    provinceFilter.province_code === '79' &&
    provinceFilter.ward_code === undefined &&
    Object.keys(adminFilter).length === 0
  );
}

export function testLocationEnforcement() {
  console.log('\n=== Location Enforcement Tests ===');

  const surveyData = {
    temp_name: 'Test Survey',
    province_code: '99', // Wrong province (should be overwritten)
    ward_code: '99999', // Wrong ward (should be overwritten)
  };

  // Ward officer - should enforce codes
  const enforced = enforceLocationCodes(surveyData, TEST_USER_SCOPES.wardOfficer);
  console.log('Enforced data:', enforced);

  // Admin - should not modify
  const adminData = enforceLocationCodes(surveyData, TEST_USER_SCOPES.admin);
  console.log('Admin data:', adminData);

  return (
    enforced.province_code === '79' &&
    enforced.ward_code === '26560' &&
    adminData.province_code === '99'
  );
}

// =============================================================================
// DISTANCE & AREA TESTS
// =============================================================================

export function testDistanceCalculation() {
  console.log('\n=== Distance Calculation Tests ===');

  const point1 = { lat: 10.5058, lng: 107.1734 };
  const point2 = { lat: 10.5158, lng: 107.1834 };

  const distance = haversineDistance(point1, point2);
  console.log(`Distance between points: ${distance.toFixed(2)} meters`);

  // Approximate expected distance: ~1.4 km
  return distance > 1000 && distance < 2000;
}

export function testAreaCalculation() {
  console.log('\n=== Area Calculation Tests ===');

  const area = calculatePolygonArea(SAMPLE_WARD_BOUNDARY.coordinates);
  console.log(`Ward boundary area: ${(area / 1000000).toFixed(4)} km²`);

  // Expected: approximately 4 km² (0.02° x 0.02° at this latitude)
  return area > 0;
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

export function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     LOCATION ACCESS CONTROL TESTS                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const results: { test: string; passed: boolean }[] = [];

  // Spatial validation tests
  results.push({ test: 'Point in Polygon', passed: testPointInPolygon() });
  results.push({ test: 'Polygon Validation', passed: testPolygonValidation() });
  results.push({ test: 'GPS Validation', passed: testGPSValidation() });
  results.push({ test: 'Comprehensive Validation', passed: testComprehensiveValidation() });

  // Access control tests
  results.push({ test: 'Ward Officer Access', passed: testWardOfficerAccess() });
  results.push({ test: 'Province Leader Access', passed: testProvinceLeaderAccess() });
  results.push({ test: 'Admin Access', passed: testAdminAccess() });
  results.push({ test: 'Location Filter', passed: testLocationFilter() });
  results.push({ test: 'Location Enforcement', passed: testLocationEnforcement() });

  // Utility tests
  results.push({ test: 'Distance Calculation', passed: testDistanceCalculation() });
  results.push({ test: 'Area Calculation', passed: testAreaCalculation() });

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST RESULTS:');
  console.log('═══════════════════════════════════════════════════════════════');

  let passedCount = 0;
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.test}`);
    if (result.passed) passedCount++;
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total: ${passedCount}/${results.length} tests passed`);
  console.log('═══════════════════════════════════════════════════════════════');

  return passedCount === results.length;
}

// Export for use in test runner
export default {
  runAllTests,
  testPointInPolygon,
  testPolygonValidation,
  testGPSValidation,
  testComprehensiveValidation,
  testWardOfficerAccess,
  testProvinceLeaderAccess,
  testAdminAccess,
  testLocationFilter,
  testLocationEnforcement,
  testDistanceCalculation,
  testAreaCalculation,
  // Test data
  SAMPLE_WARD_BOUNDARY,
  POINT_INSIDE,
  POINT_OUTSIDE,
  TEST_USER_SCOPES,
  TEST_SURVEY_LOCATIONS,
};
