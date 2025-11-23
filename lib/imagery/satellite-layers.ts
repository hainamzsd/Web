// Satellite Imagery Integration
// Multi-source satellite and aerial imagery layers

export interface ImageryProvider {
  id: string
  name: string
  description: string
  attribution: string
  maxZoom: number
  minZoom: number
  url: string
  subdomains?: string[]
  apiKey?: string
  type: 'satellite' | 'hybrid' | 'terrain' | 'street'
  features: {
    realtime?: boolean
    historical?: boolean
    ndvi?: boolean // Vegetation index
    elevation?: boolean
    weather?: boolean
  }
}

/**
 * Satellite Imagery Providers Configuration
 */
export const IMAGERY_PROVIDERS: Record<string, ImageryProvider> = {
  // Google Satellite (requires API key in production)
  googleSatellite: {
    id: 'google-satellite',
    name: 'Google Satellite',
    description: 'High-resolution satellite imagery from Google',
    attribution: '© Google',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    type: 'satellite',
    maxZoom: 21,
    minZoom: 0,
    features: {
      realtime: false,
      historical: true
    }
  },

  googleHybrid: {
    id: 'google-hybrid',
    name: 'Google Hybrid',
    description: 'Satellite imagery with labels and roads',
    attribution: '© Google',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    type: 'hybrid',
    maxZoom: 21,
    minZoom: 0,
    features: {
      realtime: false,
      historical: true
    }
  },

  // Sentinel-2 (ESA - Free and Open)
  sentinel2: {
    id: 'sentinel-2',
    name: 'Sentinel-2 (ESA)',
    description: 'Free satellite imagery from European Space Agency, 10m resolution',
    attribution: '© ESA/Copernicus',
    url: 'https://services.sentinel-hub.com/ogc/wms/{instanceId}',
    type: 'satellite',
    maxZoom: 18,
    minZoom: 0,
    apiKey: process.env.NEXT_PUBLIC_SENTINEL_API_KEY,
    features: {
      realtime: true,
      historical: true,
      ndvi: true
    }
  },

  // Mapbox Satellite
  mapboxSatellite: {
    id: 'mapbox-satellite',
    name: 'Mapbox Satellite',
    description: 'High-quality satellite imagery from Mapbox',
    attribution: '© Mapbox',
    url: 'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg?access_token={accessToken}',
    type: 'satellite',
    maxZoom: 22,
    minZoom: 0,
    apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    features: {
      realtime: false,
      historical: false
    }
  },

  // ESRI World Imagery
  esriWorldImagery: {
    id: 'esri-world',
    name: 'ESRI World Imagery',
    description: 'Global satellite and aerial imagery',
    attribution: '© Esri',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    type: 'satellite',
    maxZoom: 19,
    minZoom: 0,
    features: {
      realtime: false,
      historical: false
    }
  },

  // Bing Maps Aerial
  bingAerial: {
    id: 'bing-aerial',
    name: 'Bing Aerial',
    description: 'Microsoft Bing aerial imagery',
    attribution: '© Microsoft',
    url: 'https://ecn.t{s}.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=1',
    subdomains: ['0', '1', '2', '3'],
    type: 'satellite',
    maxZoom: 21,
    minZoom: 1,
    features: {
      realtime: false,
      historical: false
    }
  },

  // OpenStreetMap (for comparison)
  openStreetMap: {
    id: 'osm',
    name: 'OpenStreetMap',
    description: 'Community-built street map',
    attribution: '© OpenStreetMap contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    type: 'street',
    maxZoom: 19,
    minZoom: 0,
    features: {}
  },

  // Terrain/Elevation
  terrainRGB: {
    id: 'terrain-rgb',
    name: 'Terrain RGB',
    description: 'Elevation data encoded in RGB',
    attribution: '© Mapbox',
    url: 'https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token={accessToken}',
    type: 'terrain',
    maxZoom: 15,
    minZoom: 0,
    apiKey: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    features: {
      elevation: true
    }
  },

  // NDVI Layer (Vegetation Index)
  ndviLayer: {
    id: 'ndvi',
    name: 'NDVI (Vegetation)',
    description: 'Normalized Difference Vegetation Index - shows vegetation health',
    attribution: '© ESA/Copernicus',
    url: 'https://services.sentinel-hub.com/ogc/wms/{instanceId}',
    type: 'satellite',
    maxZoom: 18,
    minZoom: 0,
    apiKey: process.env.NEXT_PUBLIC_SENTINEL_API_KEY,
    features: {
      ndvi: true,
      realtime: true
    }
  }
}

/**
 * Time-series imagery configuration
 */
export interface TimeSeriesConfig {
  startDate: Date
  endDate: Date
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly'
  cloudCoverage: number // 0-100
  provider: string
}

/**
 * Imagery Analysis Tools
 */
export class ImageryAnalysis {
  /**
   * Calculate NDVI from RGB bands
   * NDVI = (NIR - Red) / (NIR + Red)
   */
  static calculateNDVI(nir: number, red: number): number {
    if (nir + red === 0) return 0
    return (nir - red) / (nir + red)
  }

  /**
   * Classify NDVI values
   */
  static classifyNDVI(ndvi: number): {
    class: string
    description: string
    color: string
  } {
    if (ndvi < -0.1) {
      return {
        class: 'water',
        description: 'Nước',
        color: '#0000FF'
      }
    } else if (ndvi < 0.1) {
      return {
        class: 'barren',
        description: 'Đất trống/Đá',
        color: '#8B4513'
      }
    } else if (ndvi < 0.3) {
      return {
        class: 'sparse_vegetation',
        description: 'Thảm thực vật thưa',
        color: '#FFFF00'
      }
    } else if (ndvi < 0.6) {
      return {
        class: 'moderate_vegetation',
        description: 'Thảm thực vật trung bình',
        color: '#90EE90'
      }
    } else {
      return {
        class: 'dense_vegetation',
        description: 'Thảm thực vật dày đặc',
        color: '#006400'
      }
    }
  }

  /**
   * Extract elevation from Terrain RGB tile
   */
  static extractElevation(r: number, g: number, b: number): number {
    // Mapbox Terrain RGB formula
    return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1
  }

  /**
   * Detect land use change between two time periods
   */
  static detectChange(
    before: ImageData,
    after: ImageData,
    threshold: number = 30
  ): {
    changedPixels: number
    totalPixels: number
    changePercentage: number
    changeMap: Uint8ClampedArray
  } {
    const changeMap = new Uint8ClampedArray(before.data.length)
    let changedPixels = 0

    for (let i = 0; i < before.data.length; i += 4) {
      const rDiff = Math.abs(before.data[i] - after.data[i])
      const gDiff = Math.abs(before.data[i + 1] - after.data[i + 1])
      const bDiff = Math.abs(before.data[i + 2] - after.data[i + 2])

      const totalDiff = (rDiff + gDiff + bDiff) / 3

      if (totalDiff > threshold) {
        changeMap[i] = 255 // R
        changeMap[i + 1] = 0 // G
        changeMap[i + 2] = 0 // B
        changeMap[i + 3] = 255 // A
        changedPixels++
      } else {
        changeMap[i] = 0
        changeMap[i + 1] = 0
        changeMap[i + 2] = 0
        changeMap[i + 3] = 0
      }
    }

    return {
      changedPixels: changedPixels / 4,
      totalPixels: before.data.length / 4,
      changePercentage: (changedPixels / 4) / (before.data.length / 4) * 100,
      changeMap
    }
  }

  /**
   * Calculate area from satellite imagery
   * Using pixel counting with known resolution
   */
  static calculateAreaFromImage(
    imageData: ImageData,
    pixelSize: number, // meters per pixel
    threshold: number = 128
  ): number {
    let pixelCount = 0

    for (let i = 0; i < imageData.data.length; i += 4) {
      const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
      if (brightness > threshold) {
        pixelCount++
      }
    }

    return pixelCount * pixelSize * pixelSize // square meters
  }
}

/**
 * Historical Imagery Manager
 */
export class HistoricalImagery {
  private availableDates: Map<string, Date[]> = new Map()

  /**
   * Get available historical imagery dates for a location
   */
  async getAvailableDates(
    latitude: number,
    longitude: number,
    provider: string = 'sentinel-2'
  ): Promise<Date[]> {
    // In production, query Sentinel Hub or other provider APIs
    // For now, return mock data
    const dates: Date[] = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const date = new Date(now)
      date.setMonth(date.getMonth() - i)
      dates.push(date)
    }

    return dates
  }

  /**
   * Compare imagery from different time periods
   */
  async compareTimePeriods(
    location: { latitude: number; longitude: number },
    date1: Date,
    date2: Date
  ): Promise<{
    changeDetected: boolean
    changePercentage: number
    changeType: 'vegetation' | 'construction' | 'deforestation' | 'flooding' | 'unknown'
    description: string
  }> {
    // This would fetch actual imagery and perform analysis
    // Returning mock for demonstration
    return {
      changeDetected: true,
      changePercentage: 15.3,
      changeType: 'construction',
      description: 'Phát hiện hoạt động xây dựng mới trong khu vực'
    }
  }
}

/**
 * Layer Switcher Configuration
 */
export interface LayerControl {
  baseLayer: string
  overlays: string[]
  opacity: Record<string, number>
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay'
}

export const DEFAULT_LAYER_CONTROL: LayerControl = {
  baseLayer: 'openStreetMap',
  overlays: [],
  opacity: {
    'google-satellite': 1.0,
    'google-hybrid': 1.0,
    'sentinel-2': 0.8,
    'ndvi': 0.6
  }
}
