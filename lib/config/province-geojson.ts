/**
 * Province GeoJSON Configuration
 * Maps province codes to folder names for GeoJSON files
 */

export interface ProvinceGeoConfig {
  code: string
  folder: string
  name: string
  center: [number, number] // [lat, lng]
}

// Province code to folder mapping
export const PROVINCE_GEOJSON_MAP: Record<string, ProvinceGeoConfig> = {
  '01': { code: '01', folder: 'hanoi', name: 'Hà Nội', center: [21.0285, 105.8542] },
  '04': { code: '04', folder: 'caobang', name: 'Cao Bằng', center: [22.6657, 106.2522] },
  '08': { code: '08', folder: 'tuyenquang', name: 'Tuyên Quang', center: [21.8237, 105.2181] },
  '12': { code: '12', folder: 'laichau', name: 'Lai Châu', center: [22.3964, 103.4583] },
  '14': { code: '14', folder: 'sonla', name: 'Sơn La', center: [21.3256, 103.9188] },
  '15': { code: '15', folder: 'laocai', name: 'Lào Cai', center: [22.4856, 103.9707] },
  '19': { code: '19', folder: 'thainguyen', name: 'Thái Nguyên', center: [21.5928, 105.8442] },
  '20': { code: '20', folder: 'langson', name: 'Lạng Sơn', center: [21.8537, 106.7615] },
  '22': { code: '22', folder: 'quangninh', name: 'Quảng Ninh', center: [21.0064, 107.2925] },
  '24': { code: '24', folder: 'bacninh', name: 'Bắc Ninh', center: [21.1861, 106.0763] },
  '25': { code: '25', folder: 'phutho', name: 'Phú Thọ', center: [21.3227, 105.1753] },
  '31': { code: '31', folder: 'haiphong', name: 'Hải Phòng', center: [20.8449, 106.6881] },
  '33': { code: '33', folder: 'hungyen', name: 'Hưng Yên', center: [20.6464, 106.0511] },
  '37': { code: '37', folder: 'ninhbinh', name: 'Ninh Bình', center: [20.2506, 105.9745] },
  '38': { code: '38', folder: 'thanhhoa', name: 'Thanh Hóa', center: [19.8067, 105.7852] },
  '40': { code: '40', folder: 'nghean', name: 'Nghệ An', center: [18.6789, 105.6813] },
  '42': { code: '42', folder: 'hatinh', name: 'Hà Tĩnh', center: [18.3559, 105.8877] },
  '44': { code: '44', folder: 'quangtri', name: 'Quảng Trị', center: [16.7503, 107.1856] },
  '46': { code: '46', folder: 'hue', name: 'Thừa Thiên Huế', center: [16.4637, 107.5909] },
  '51': { code: '51', folder: 'quangngai', name: 'Quảng Ngãi', center: [15.1214, 108.8044] },
  '52': { code: '52', folder: 'gialai', name: 'Gia Lai', center: [13.9833, 108.0000] },
  '56': { code: '56', folder: 'khanhhoa', name: 'Khánh Hòa', center: [12.2585, 109.0526] },
  '68': { code: '68', folder: 'lamdong', name: 'Lâm Đồng', center: [11.9404, 108.4583] },
  '79': { code: '79', folder: 'hochiminh', name: 'TP. Hồ Chí Minh', center: [10.8231, 106.6297] },
  '91': { code: '91', folder: 'angiang', name: 'An Giang', center: [10.5216, 105.1259] },
  '92': { code: '92', folder: 'cantho', name: 'Cần Thơ', center: [10.0452, 105.7469] },
  '96': { code: '96', folder: 'camau', name: 'Cà Mau', center: [9.1527, 105.1961] },
}

// Get all available province codes
export const getAvailableProvinceCodes = (): string[] => {
  return Object.keys(PROVINCE_GEOJSON_MAP)
}

// Get province config by code
export const getProvinceConfig = (code: string): ProvinceGeoConfig | undefined => {
  return PROVINCE_GEOJSON_MAP[code]
}

// Get GeoJSON URL for province boundary
export const getProvinceGeoJsonUrl = (code: string): string | null => {
  const config = PROVINCE_GEOJSON_MAP[code]
  if (!config) return null
  return `/geojson/${config.folder}/province.geojson`
}

// Get GeoJSON URL for ward boundaries
export const getWardGeoJsonUrl = (code: string): string | null => {
  const config = PROVINCE_GEOJSON_MAP[code]
  if (!config) return null
  return `/geojson/${config.folder}/ward.geojson`
}
