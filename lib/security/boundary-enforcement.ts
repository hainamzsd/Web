/**
 * Administrative Boundary Enforcement System
 * Ensures officers can only access and modify data within their jurisdiction
 */

import { LatLngBounds, LatLng } from 'leaflet'
import { VIETNAM_PROVINCES, Province } from '@/lib/map/vietnam-administrative-data'

export type UserRole = 'commune_officer' | 'commune_supervisor' | 'central_admin' | 'system_admin'

export interface BoundaryContext {
  role: UserRole
  province_code: string | null
  district_code: string | null
  commune_code: string | null
}

export interface BoundaryCheck {
  isWithinBounds: boolean
  boundaryViolation: boolean
  allowedBounds: LatLngBounds | null
  message?: string
}

/**
 * Get the allowed boundary for a user based on their role and jurisdiction
 */
export function getUserBoundary(context: BoundaryContext): LatLngBounds | null {
  // Central and system admins can access all of Vietnam
  if (context.role === 'central_admin' || context.role === 'system_admin') {
    return new LatLngBounds([8.0, 102.0], [23.5, 110.0]) // All Vietnam
  }

  // Province-level access
  if (context.province_code && !context.commune_code) {
    const province = VIETNAM_PROVINCES.find(p => p.code === context.province_code)
    if (province) {
      return new LatLngBounds(
        [province.bounds[0][0], province.bounds[0][1]],
        [province.bounds[1][0], province.bounds[1][1]]
      )
    }
  }

  // Commune-level access (officers and supervisors)
  // In real implementation, you would fetch commune boundaries from database
  // For now, we'll use a default buffer around the commune center
  if (context.commune_code) {
    // TODO: Fetch actual commune boundary from database
    // For demo purposes, using province boundary with smaller buffer
    const province = VIETNAM_PROVINCES.find(p => p.code === context.province_code)
    if (province) {
      const buffer = 0.1 // ~11km buffer
      const center = province.center
      return new LatLngBounds(
        [center[0] - buffer, center[1] - buffer],
        [center[0] + buffer, center[1] + buffer]
      )
    }
  }

  return null
}

/**
 * Check if a point is within the user's allowed boundary
 */
export function checkPointWithinBoundary(
  lat: number,
  lng: number,
  context: BoundaryContext
): BoundaryCheck {
  const allowedBounds = getUserBoundary(context)

  if (!allowedBounds) {
    return {
      isWithinBounds: false,
      boundaryViolation: true,
      allowedBounds: null,
      message: 'Unable to determine allowed boundary'
    }
  }

  const point = new LatLng(lat, lng)
  const isWithinBounds = allowedBounds.contains(point)

  return {
    isWithinBounds,
    boundaryViolation: !isWithinBounds,
    allowedBounds,
    message: isWithinBounds
      ? 'Point is within allowed boundary'
      : 'Point is outside your jurisdiction'
  }
}

/**
 * Check if a polygon is within the user's allowed boundary
 */
export function checkPolygonWithinBoundary(
  coordinates: [number, number][],
  context: BoundaryContext
): BoundaryCheck {
  const allowedBounds = getUserBoundary(context)

  if (!allowedBounds) {
    return {
      isWithinBounds: false,
      boundaryViolation: true,
      allowedBounds: null,
      message: 'Unable to determine allowed boundary'
    }
  }

  // Check if all points of the polygon are within bounds
  const allPointsWithin = coordinates.every(coord => {
    const point = new LatLng(coord[0], coord[1])
    return allowedBounds.contains(point)
  })

  return {
    isWithinBounds: allPointsWithin,
    boundaryViolation: !allPointsWithin,
    allowedBounds,
    message: allPointsWithin
      ? 'Polygon is within allowed boundary'
      : 'Some points of the polygon are outside your jurisdiction'
  }
}

/**
 * Get the inverse mask geometry for graying out areas outside boundary
 * Returns GeoJSON for the area outside the allowed boundary
 */
export function getBoundaryMaskGeometry(context: BoundaryContext) {
  const allowedBounds = getUserBoundary(context)

  if (!allowedBounds) {
    return null
  }

  // Create a GeoJSON MultiPolygon that covers everything except the allowed area
  const vietnamBounds = [[8.0, 102.0], [23.5, 110.0]]
  const sw = allowedBounds.getSouthWest()
  const ne = allowedBounds.getNorthEast()

  return {
    type: 'Feature',
    properties: {
      fill: true,
      fillColor: '#000000',
      fillOpacity: 0.4,
      stroke: true,
      color: '#ff0000',
      weight: 2,
      interactive: false
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        // Outer ring (Vietnam bounds)
        [vietnamBounds[0][1], vietnamBounds[0][0]],
        [vietnamBounds[1][1], vietnamBounds[0][0]],
        [vietnamBounds[1][1], vietnamBounds[1][0]],
        [vietnamBounds[0][1], vietnamBounds[1][0]],
        [vietnamBounds[0][1], vietnamBounds[0][0]]
      ], [
        // Inner ring (hole for allowed area)
        [sw.lng, sw.lat],
        [ne.lng, sw.lat],
        [ne.lng, ne.lat],
        [sw.lng, ne.lat],
        [sw.lng, sw.lat]
      ]]
    }
  }
}

/**
 * Validate if user has permission to modify a survey based on its location
 */
export function validateSurveyAccess(
  survey: {
    province_code: string | null
    district_code: string | null
    ward_code: string | null
    latitude: number
    longitude: number
  },
  context: BoundaryContext
): { allowed: boolean; reason?: string } {
  // Central and system admins have access to everything
  if (context.role === 'central_admin' || context.role === 'system_admin') {
    return { allowed: true }
  }

  // Check administrative code match
  if (context.role === 'commune_officer' || context.role === 'commune_supervisor') {
    if (survey.ward_code !== context.commune_code) {
      return {
        allowed: false,
        reason: 'Survey is not in your commune jurisdiction'
      }
    }
  }

  // Check geographic boundary
  const boundaryCheck = checkPointWithinBoundary(
    survey.latitude,
    survey.longitude,
    context
  )

  if (!boundaryCheck.isWithinBounds) {
    return {
      allowed: false,
      reason: boundaryCheck.message
    }
  }

  return { allowed: true }
}
