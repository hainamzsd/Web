/**
 * Vietmap GL JS Configuration
 *
 * Vietmap is a Vietnamese map provider that respects Vietnam's territorial claims
 * API Documentation: https://maps.vietmap.vn/docs/
 */

// Get API Key dynamically (for client-side use)
export function getVietmapApiKey(): string {
  return process.env.NEXT_PUBLIC_VIETMAP_API_KEY || ''
}

// Legacy export for backward compatibility
export const VIETMAP_API_KEY = process.env.NEXT_PUBLIC_VIETMAP_API_KEY || ''

// Get Vietmap style URL dynamically
export function getVietmapStyleUrl(style: 'default' | 'light' | 'dark' = 'default'): string {
  const apiKey = getVietmapApiKey()
  const styleMap: Record<string, string> = {
    default: 'tm',  // Default/streets
    light: 'lm',    // Light mode
    dark: 'dm'      // Dark mode
  }
  const styleCode = styleMap[style] || 'tm'
  return `https://maps.vietmap.vn/maps/styles/${styleCode}/style.json?apikey=${apiKey}`
}

// Vietmap Vector style URLs (built dynamically)
// Correct URL format: https://maps.vietmap.vn/maps/styles/{style}/style.json?apikey={key}
export const VIETMAP_STYLES = {
  get default() { return `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${getVietmapApiKey()}` },
  get light() { return `https://maps.vietmap.vn/maps/styles/lm/style.json?apikey=${getVietmapApiKey()}` },
  get dark() { return `https://maps.vietmap.vn/maps/styles/dm/style.json?apikey=${getVietmapApiKey()}` },
  get streets() { return `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${getVietmapApiKey()}` },
}

// Styled raster tiles (Carto Voyager - clean modern look)
// Note: For production with official Vietmap tiles, register your domain at maps.vietmap.vn
export function getVietmapRasterStyle(): any {
  return {
    version: 8,
    sources: {
      'carto-voyager': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
        ],
        tileSize: 256,
        attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    },
    layers: [
      {
        id: 'carto-voyager-layer',
        type: 'raster',
        source: 'carto-voyager',
        minzoom: 0,
        maxzoom: 20
      }
    ]
  }
}

// Dark style for Vietmap
export function getVietmapDarkStyle(): any {
  return {
    version: 8,
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png'
        ],
        tileSize: 256,
        attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    },
    layers: [
      {
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 20
      }
    ]
  }
}

// Light style for Vietmap
export function getVietmapLightStyle(): any {
  return {
    version: 8,
    sources: {
      'carto-light': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png'
        ],
        tileSize: 256,
        attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    },
    layers: [
      {
        id: 'carto-light-layer',
        type: 'raster',
        source: 'carto-light',
        minzoom: 0,
        maxzoom: 20
      }
    ]
  }
}

// Vietmap raster style - requires domain registration at maps.vietmap.vn
export function getVietmapOfficialRasterStyle(): any {
  const apiKey = getVietmapApiKey()
  return {
    version: 8,
    sources: {
      'vietmap-raster': {
        type: 'raster',
        tiles: [
          `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${apiKey}`
        ],
        tileSize: 256,
        attribution: '© <a href="https://vietmap.vn">Vietmap</a>'
      }
    },
    layers: [
      {
        id: 'vietmap-raster-layer',
        type: 'raster',
        source: 'vietmap-raster',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  }
}

// Default map configuration for Vietnam
export const VIETMAP_DEFAULT_CONFIG = {
  // Center of Vietnam
  center: [108.0, 16.0] as [number, number], // [lng, lat]
  zoom: 6,
  minZoom: 4,
  maxZoom: 19,
  // Vietnam bounds
  maxBounds: [
    [101.0, 7.0],  // Southwest corner [lng, lat]
    [115.0, 24.0]  // Northeast corner [lng, lat]
  ] as [[number, number], [number, number]]
}

// Tile URL for raster tiles (if using raster mode)
export const VIETMAP_TILE_URL = `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${VIETMAP_API_KEY}`

// Geocoding API URL
export const VIETMAP_GEOCODE_URL = 'https://maps.vietmap.vn/api/geocode/v3'

// Autocomplete API URL
export const VIETMAP_AUTOCOMPLETE_URL = 'https://maps.vietmap.vn/api/autocomplete/v3'

// Marker colors for different statuses
export const MARKER_COLORS = {
  pending: '#f59e0b',      // Amber
  reviewed: '#0ea5e9',     // Sky blue
  approved_commune: '#8b5cf6', // Purple
  approved_central: '#3b82f6', // Blue
  published: '#10b981',    // Green
  rejected: '#ef4444',     // Red
  default: '#6b7280'       // Gray
}

// Get marker color by status
export function getMarkerColor(status: string): string {
  return MARKER_COLORS[status as keyof typeof MARKER_COLORS] || MARKER_COLORS.default
}

// Status labels in Vietnamese
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  reviewed: 'Đã xem xét',
  approved_commune: 'Đã duyệt (Xã)',
  approved_central: 'Đã duyệt (TW)',
  published: 'Đã công bố',
  rejected: 'Từ chối'
}

// Get status label
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

// Status color classes for badges
export const STATUS_BADGE_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-sky-100 text-sky-700',
  approved_commune: 'bg-purple-100 text-purple-700',
  approved_central: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}

export function getStatusBadgeColor(status: string): string {
  return STATUS_BADGE_COLORS[status] || 'bg-gray-100 text-gray-700'
}
