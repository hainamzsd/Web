import { Database } from '@/lib/types/database'

type SurveyLocation = Database['public']['Tables']['survey_locations']['Row']

export function exportToCSV(surveys: SurveyLocation[], filename: string = 'surveys.csv') {
  // Define headers
  const headers = [
    'ID',
    'Tên vị trí',
    'Địa chỉ',
    'Số nhà',
    'Đường',
    'Thôn/Xóm',
    'Mã xã',
    'Mã huyện',
    'Mã tỉnh',
    'Vĩ độ',
    'Kinh độ',
    'Độ chính xác',
    'Loại đối tượng',
    'Loại đất',
    'Chủ sở hữu',
    'CMND/CCCD',
    'Điện thoại',
    'Mã thửa đất',
    'Diện tích (m2)',
    'Trạng thái',
    'Mã định danh',
    'Ghi chú',
    'Ngày tạo',
    'Ngày cập nhật',
  ]

  // Convert surveys to CSV rows
  const rows = surveys.map(survey => [
    survey.id,
    survey.location_name || '',
    survey.address || '',
    survey.house_number || '',
    survey.street || '',
    survey.hamlet || '',
    survey.ward_code || '',
    survey.district_code || '',
    survey.province_code || '',
    survey.latitude,
    survey.longitude,
    survey.accuracy || '',
    survey.object_type || '',
    survey.land_use_type || '',
    survey.owner_name || '',
    survey.owner_id_number || '',
    survey.owner_phone || '',
    survey.parcel_code || '',
    survey.land_area_m2 || '',
    survey.status,
    survey.location_identifier || '',
    survey.notes || '',
    new Date(survey.created_at).toLocaleString('vi-VN'),
    new Date(survey.updated_at).toLocaleString('vi-VN'),
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        // Escape cells that contain commas or quotes
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    )
  ].join('\n')

  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToGeoJSON(surveys: SurveyLocation[], filename: string = 'surveys.geojson') {
  const features = surveys.map(survey => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [survey.longitude, survey.latitude]
    },
    properties: {
      id: survey.id,
      name: survey.location_name,
      address: survey.address,
      status: survey.status,
      location_identifier: survey.location_identifier,
      owner_name: survey.owner_name,
      object_type: survey.object_type,
      land_use_type: survey.land_use_type,
      created_at: survey.created_at,
    }
  }))

  const geojson = {
    type: 'FeatureCollection',
    features
  }

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
