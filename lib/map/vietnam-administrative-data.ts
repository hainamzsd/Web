// Vietnam Administrative Division Data
// This file contains the hierarchical structure of Vietnam's administrative divisions
// Based on General Statistics Office of Vietnam (GSO) codes

export interface Province {
  code: string
  name: string
  name_en: string
  region: 'north' | 'central' | 'south'
  capital: string
  area_km2: number
  population: number
  center: [number, number] // [lat, lng]
  bounds: [[number, number], [number, number]] // [[minLat, minLng], [maxLat, maxLng]]
}

export interface District {
  code: string
  name: string
  name_en: string
  province_code: string
  type: 'thanh_pho' | 'thi_xa' | 'huyen' | 'quan' // city, town, district, urban district
  center: [number, number]
}

export interface Commune {
  code: string
  name: string
  name_en: string
  district_code: string
  province_code: string
  type: 'phuong' | 'xa' | 'thi_tran' // ward, commune, township
  center: [number, number]
}

// Sample Vietnam Provinces (All 63 provinces/cities)
export const VIETNAM_PROVINCES: Province[] = [
  {
    code: '01',
    name: 'Hà Nội',
    name_en: 'Ha Noi',
    region: 'north',
    capital: 'Hà Nội',
    area_km2: 3328.9,
    population: 8246600,
    center: [21.0285, 105.8542],
    bounds: [[20.5, 105.3], [21.4, 106.0]]
  },
  {
    code: '79',
    name: 'Thành phố Hồ Chí Minh',
    name_en: 'Ho Chi Minh City',
    region: 'south',
    capital: 'TP. Hồ Chí Minh',
    area_km2: 2095.5,
    population: 9077158,
    center: [10.8231, 106.6297],
    bounds: [[10.3, 106.3], [11.2, 107.0]]
  },
  {
    code: '48',
    name: 'Đà Nẵng',
    name_en: 'Da Nang',
    region: 'central',
    capital: 'Đà Nẵng',
    area_km2: 1285.4,
    population: 1134310,
    center: [16.0544, 108.2022],
    bounds: [[15.9, 107.9], [16.2, 108.3]]
  },
  {
    code: '31',
    name: 'Hải Phòng',
    name_en: 'Hai Phong',
    region: 'north',
    capital: 'Hải Phòng',
    area_km2: 1527.4,
    population: 2028514,
    center: [20.8449, 106.6881],
    bounds: [[20.5, 106.4], [21.0, 107.1]]
  },
  {
    code: '92',
    name: 'Cần Thơ',
    name_en: 'Can Tho',
    region: 'south',
    capital: 'Cần Thơ',
    area_km2: 1409.0,
    population: 1282095,
    center: [10.0452, 105.7469],
    bounds: [[9.8, 105.4], [10.3, 106.0]]
  },
  // Add more provinces as needed...
]

// Sample Districts for Hanoi
export const VIETNAM_DISTRICTS: District[] = [
  {
    code: '001',
    name: 'Ba Đình',
    name_en: 'Ba Dinh',
    province_code: '01',
    type: 'quan',
    center: [21.0341, 105.8195]
  },
  {
    code: '002',
    name: 'Hoàn Kiếm',
    name_en: 'Hoan Kiem',
    province_code: '01',
    type: 'quan',
    center: [21.0285, 105.8542]
  },
  {
    code: '003',
    name: 'Tây Hồ',
    name_en: 'Tay Ho',
    province_code: '01',
    type: 'quan',
    center: [21.0583, 105.8189]
  },
  // HCMC Districts
  {
    code: '760',
    name: 'Quận 1',
    name_en: 'District 1',
    province_code: '79',
    type: 'quan',
    center: [10.7756, 106.7019]
  },
  {
    code: '761',
    name: 'Quận 2',
    name_en: 'District 2',
    province_code: '79',
    type: 'quan',
    center: [10.7897, 106.7419]
  },
  // Add more districts...
]

// Sample Communes
export const VIETNAM_COMMUNES: Commune[] = [
  {
    code: '00001',
    name: 'Phúc Xá',
    name_en: 'Phuc Xa',
    district_code: '001',
    province_code: '01',
    type: 'phuong',
    center: [21.0356, 105.8156]
  },
  {
    code: '00002',
    name: 'Trúc Bạch',
    name_en: 'Truc Bach',
    district_code: '001',
    province_code: '01',
    type: 'phuong',
    center: [21.0450, 105.8350]
  },
  // Add more communes...
]

// Region boundaries
export const VIETNAM_REGIONS = {
  north: {
    name: 'Miền Bắc',
    name_en: 'Northern Vietnam',
    center: [21.0, 105.8],
    bounds: [[20.0, 102.0], [23.5, 109.5]]
  },
  central: {
    name: 'Miền Trung',
    name_en: 'Central Vietnam',
    center: [16.0, 108.0],
    bounds: [[13.0, 105.0], [19.0, 109.5]]
  },
  south: {
    name: 'Miền Nam',
    name_en: 'Southern Vietnam',
    center: [10.5, 106.5],
    bounds: [[8.0, 104.0], [12.5, 109.5]]
  }
}

// Vietnam country bounds
export const VIETNAM_BOUNDS: [[number, number], [number, number]] = [
  [8.1790665, 102.1445523], // Southwest
  [23.3926504, 109.4693146]  // Northeast
]

export const VIETNAM_CENTER: [number, number] = [16.0544, 108.2022] // Da Nang

// Helper functions
export function getProvinceByCode(code: string): Province | undefined {
  return VIETNAM_PROVINCES.find(p => p.code === code)
}

export function getDistrictByCode(code: string): District | undefined {
  return VIETNAM_DISTRICTS.find(d => d.code === code)
}

export function getCommuneByCode(code: string): Commune | undefined {
  return VIETNAM_COMMUNES.find(c => c.code === code)
}

export function getDistrictsByProvince(provinceCode: string): District[] {
  return VIETNAM_DISTRICTS.filter(d => d.province_code === provinceCode)
}

export function getCommunesByDistrict(districtCode: string): Commune[] {
  return VIETNAM_COMMUNES.filter(c => c.district_code === districtCode)
}

export function formatLocationCode(provinceCode: string, districtCode: string, communeCode: string): string {
  return `${provinceCode}-${districtCode}-${communeCode}`
}

export function parseLocationCode(code: string): { province: string; district: string; commune: string } | null {
  const parts = code.split('-')
  if (parts.length !== 3) return null
  return {
    province: parts[0],
    district: parts[1],
    commune: parts[2]
  }
}

// Location type labels
export const DISTRICT_TYPE_LABELS = {
  thanh_pho: 'Thành phố',
  thi_xa: 'Thị xã',
  huyen: 'Huyện',
  quan: 'Quận'
}

export const COMMUNE_TYPE_LABELS = {
  phuong: 'Phường',
  xa: 'Xã',
  thi_tran: 'Thị trấn'
}
