// Google Maps Configuration
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

export const MAP_CONFIG = {
  // Vietnam center coordinates
  DEFAULT_CENTER: { lat: 16.0544, lng: 108.2022 },
  DEFAULT_ZOOM: 6,
  MAX_ZOOM: 20,
  MIN_ZOOM: 5,

  // Map styles
  MAP_ID: '', // Optional: Use a Map ID for cloud-based styling

  // Marker colors by status
  MARKER_COLORS: {
    pending: '#FCD34D',
    reviewed: '#60A5FA',
    approved_commune: '#34D399',
    rejected: '#F87171',
    approved_central: '#10B981',
    published: '#8B5CF6'
  } as Record<string, string>
}

export const VIETNAM_BOUNDS = {
  north: 23.393395,
  south: 8.1790665,
  east: 114.33440976,
  west: 102.14441
}

// Hanoi bounds for demo mode
export const HANOI_BOUNDS = {
  north: 21.20,
  south: 20.85,
  east: 106.05,
  west: 105.65
}

// Google Maps libraries to load
export const GOOGLE_MAPS_LIBRARIES: ("drawing" | "geometry" | "places" | "visualization")[] = [
  'drawing',
  'geometry',
  'visualization'
]

// Default map options
export const DEFAULT_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
}

// Polygon styling
export const POLYGON_STYLES = {
  default: {
    strokeColor: '#3b82f6',
    strokeOpacity: 1,
    strokeWeight: 3,
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
  },
  selected: {
    strokeColor: '#2563eb',
    strokeOpacity: 1,
    strokeWeight: 3,
    fillColor: '#3b82f6',
    fillOpacity: 0.25,
  },
  boundary: {
    strokeColor: '#1e40af',
    strokeOpacity: 0.8,
    strokeWeight: 3,
    fillColor: 'transparent',
    fillOpacity: 0,
  },
  mask: {
    strokeColor: 'transparent',
    strokeOpacity: 0,
    strokeWeight: 0,
    fillColor: '#e2e8f0',
    fillOpacity: 1,
  }
}
