import { LatLngExpression } from 'leaflet'

export const MAP_CONFIG = {
  // Vietnam center coordinates
  DEFAULT_CENTER: [16.0544, 108.2022] as LatLngExpression,
  DEFAULT_ZOOM: 6,
  MAX_ZOOM: 20,
  MIN_ZOOM: 5,

  // Tile layers
  TILE_LAYERS: {
    openStreetMap: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri'
    }
  },

  // Marker colors by status
  MARKER_COLORS: {
    pending: '#FCD34D',
    reviewed: '#60A5FA',
    approved_commune: '#34D399',
    rejected: '#F87171',
    approved_central: '#10B981',
    published: '#8B5CF6'
  }
}

export const VIETNAM_BOUNDS: [LatLngExpression, LatLngExpression] = [
  [8.1790665, 102.14441],
  [23.393395, 114.33440976]
]
