// Spatial Query Utilities for Location Validation
// Uses PostGIS functions through Supabase

import { createClient } from '@/lib/supabase/client'

export interface Point {
  latitude: number
  longitude: number
}

export interface BoundingBox {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

/**
 * Validate if a point is within Vietnam's boundaries
 */
export async function isPointInVietnam(point: Point): Promise<boolean> {
  // Vietnam approximate bounds
  const vietnamBounds = {
    minLat: 8.1790665,
    minLng: 102.1445523,
    maxLat: 23.3926504,
    maxLng: 109.4693146
  }

  return (
    point.latitude >= vietnamBounds.minLat &&
    point.latitude <= vietnamBounds.maxLat &&
    point.longitude >= vietnamBounds.minLng &&
    point.longitude <= vietnamBounds.maxLng
  )
}

/**
 * Determine administrative division from coordinates
 * In production, this would query PostGIS with actual boundary polygons
 */
export async function getAdminDivisionFromCoords(
  point: Point
): Promise<{
  province_code: string | null
  district_code: string | null
  ward_code: string | null
}> {
  // For now, return null - in production this would use PostGIS ST_Contains
  // Example query:
  // SELECT province_code, district_code, ward_code
  // FROM administrative_boundaries
  // WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))

  // Simple approximation based on major cities
  if (isNearHanoi(point)) {
    return {
      province_code: '01',
      district_code: '001',
      ward_code: '00001'
    }
  } else if (isNearHCMC(point)) {
    return {
      province_code: '79',
      district_code: '760',
      ward_code: null
    }
  } else if (isNearDaNang(point)) {
    return {
      province_code: '48',
      district_code: '490',
      ward_code: null
    }
  }

  return {
    province_code: null,
    district_code: null,
    ward_code: null
  }
}

function isNearHanoi(point: Point): boolean {
  // Hanoi approximate center: 21.0285, 105.8542
  const distance = calculateDistance(point, { latitude: 21.0285, longitude: 105.8542 })
  return distance < 50 // within 50km
}

function isNearHCMC(point: Point): boolean {
  // HCMC approximate center: 10.8231, 106.6297
  const distance = calculateDistance(point, { latitude: 10.8231, longitude: 106.6297 })
  return distance < 50
}

function isNearDaNang(point: Point): boolean {
  // Da Nang approximate center: 16.0544, 108.2022
  const distance = calculateDistance(point, { latitude: 16.0544, longitude: 108.2022 })
  return distance < 50
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(point2.latitude - point1.latitude)
  const dLon = toRadians(point2.longitude - point1.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
    Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Find nearest surveys to a given point
 */
export async function findNearestSurveys(
  point: Point,
  limit: number = 10,
  maxDistance: number = 5 // kilometers
) {
  const supabase = createClient()

  try {
    // Get all surveys (in production, use PostGIS ST_Distance for efficiency)
    const { data: surveys, error } = await supabase
      .from('survey_locations')
      .select('*')

    if (error) throw error

    // Calculate distances and filter
    const surveysWithDistance = (surveys || [])
      .map(survey => ({
        ...survey,
        distance: calculateDistance(point, {
          latitude: survey.latitude,
          longitude: survey.longitude
        })
      }))
      .filter(s => s.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)

    return surveysWithDistance
  } catch (error) {
    console.error('Error finding nearest surveys:', error)
    return []
  }
}

/**
 * Get surveys within a bounding box
 */
export async function getSurveysInBounds(bounds: BoundingBox) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('survey_locations')
      .select('*')
      .gte('latitude', bounds.minLat)
      .lte('latitude', bounds.maxLat)
      .gte('longitude', bounds.minLng)
      .lte('longitude', bounds.maxLng)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting surveys in bounds:', error)
    return []
  }
}

/**
 * Calculate survey density for heatmap
 * Returns grid cells with survey counts
 */
export interface HeatmapCell {
  lat: number
  lng: number
  weight: number // number of surveys in cell
}

export async function calculateSurveyDensity(
  bounds: BoundingBox,
  gridSize: number = 0.1 // degrees (approximately 11km)
): Promise<HeatmapCell[]> {
  const surveys = await getSurveysInBounds(bounds)

  // Create grid
  const grid: Record<string, HeatmapCell> = {}

  surveys.forEach(survey => {
    // Round to nearest grid cell
    const cellLat = Math.floor(survey.latitude / gridSize) * gridSize + gridSize / 2
    const cellLng = Math.floor(survey.longitude / gridSize) * gridSize + gridSize / 2
    const key = `${cellLat},${cellLng}`

    if (!grid[key]) {
      grid[key] = { lat: cellLat, lng: cellLng, weight: 0 }
    }
    grid[key].weight++
  })

  return Object.values(grid)
}

/**
 * Validate location code matches coordinates
 * Checks if the administrative codes match the geographic location
 */
export async function validateLocationCode(
  point: Point,
  provinceCode: string,
  _districtCode: string,
  _wardCode: string
): Promise<{ valid: boolean; message: string }> {
  const detected = await getAdminDivisionFromCoords(point)

  if (detected.province_code && detected.province_code !== provinceCode) {
    return {
      valid: false,
      message: `Tọa độ nằm trong tỉnh ${detected.province_code}, không phải ${provinceCode}`
    }
  }

  // In production, check district and ward as well

  return {
    valid: true,
    message: 'Mã vị trí hợp lệ'
  }
}

/**
 * Check if survey overlaps with existing surveys
 * Returns true if there's another survey within tolerance distance
 */
export async function checkSurveyOverlap(
  point: Point,
  tolerance: number = 0.01 // ~1km
): Promise<{ hasOverlap: boolean; nearestDistance?: number }> {
  const nearest = await findNearestSurveys(point, 1, tolerance)

  if (nearest.length > 0) {
    return {
      hasOverlap: true,
      nearestDistance: nearest[0].distance
    }
  }

  return {
    hasOverlap: false
  }
}
