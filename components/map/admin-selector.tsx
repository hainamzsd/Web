'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  VIETNAM_PROVINCES,
  getDistrictsByProvince,
  getCommunesByDistrict,
  getProvinceByCode,
  getDistrictByCode,
  getCommuneByCode,
  DISTRICT_TYPE_LABELS,
  COMMUNE_TYPE_LABELS
} from '@/lib/map/vietnam-administrative-data'
import { MapPin, ChevronRight } from 'lucide-react'

interface AdminSelectorProps {
  onSelect?: (province: string, district: string, commune: string) => void
  initialProvince?: string
  initialDistrict?: string
  initialCommune?: string
  showFullPath?: boolean
}

export function AdminSelector({
  onSelect,
  initialProvince,
  initialDistrict,
  initialCommune,
  showFullPath = true
}: AdminSelectorProps) {
  const [selectedProvince, setSelectedProvince] = useState(initialProvince || '')
  const [selectedDistrict, setSelectedDistrict] = useState(initialDistrict || '')
  const [selectedCommune, setSelectedCommune] = useState(initialCommune || '')

  const districts = selectedProvince ? getDistrictsByProvince(selectedProvince) : []
  const communes = selectedDistrict ? getCommunesByDistrict(selectedDistrict) : []

  useEffect(() => {
    if (selectedProvince && selectedDistrict && selectedCommune && onSelect) {
      onSelect(selectedProvince, selectedDistrict, selectedCommune)
    }
  }, [selectedProvince, selectedDistrict, selectedCommune, onSelect])

  const handleProvinceChange = (code: string) => {
    setSelectedProvince(code)
    setSelectedDistrict('')
    setSelectedCommune('')
  }

  const handleDistrictChange = (code: string) => {
    setSelectedDistrict(code)
    setSelectedCommune('')
  }

  const province = getProvinceByCode(selectedProvince)
  const district = getDistrictByCode(selectedDistrict)
  const commune = getCommuneByCode(selectedCommune)

  return (
    <div className="space-y-4">
      {showFullPath && (selectedProvince || selectedDistrict || selectedCommune) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Vị trí đã chọn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {province && (
                <>
                  <span className="font-medium text-blue-600">{province.name}</span>
                  {district && <ChevronRight className="h-4 w-4 text-gray-400" />}
                </>
              )}
              {district && (
                <>
                  <span className="font-medium text-green-600">
                    {DISTRICT_TYPE_LABELS[district.type]} {district.name}
                  </span>
                  {commune && <ChevronRight className="h-4 w-4 text-gray-400" />}
                </>
              )}
              {commune && (
                <span className="font-medium text-purple-600">
                  {COMMUNE_TYPE_LABELS[commune.type]} {commune.name}
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Mã định danh: {selectedProvince && `${selectedProvince}-${selectedDistrict || '...'}-${selectedCommune || '...'}`}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Province Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tỉnh/Thành phố
          </label>
          <select
            value={selectedProvince}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">-- Chọn tỉnh/thành phố --</option>
            {VIETNAM_PROVINCES.map((prov) => (
              <option key={prov.code} value={prov.code}>
                {prov.name} ({prov.code})
              </option>
            ))}
          </select>
          {province && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
              <p className="font-medium">{province.name_en}</p>
              <p className="text-gray-600">Vùng: {
                province.region === 'north' ? 'Miền Bắc' :
                province.region === 'central' ? 'Miền Trung' : 'Miền Nam'
              }</p>
              <p className="text-gray-600">Dân số: {province.population.toLocaleString('vi-VN')}</p>
            </div>
          )}
        </div>

        {/* District Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quận/Huyện
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={!selectedProvince}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Chọn quận/huyện --</option>
            {districts.map((dist) => (
              <option key={dist.code} value={dist.code}>
                {DISTRICT_TYPE_LABELS[dist.type]} {dist.name} ({dist.code})
              </option>
            ))}
          </select>
          {district && (
            <div className="mt-2 p-2 bg-green-50 rounded text-xs">
              <p className="font-medium">{district.name_en}</p>
              <p className="text-gray-600">Loại: {DISTRICT_TYPE_LABELS[district.type]}</p>
            </div>
          )}
        </div>

        {/* Commune Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phường/Xã/Thị trấn
          </label>
          <select
            value={selectedCommune}
            onChange={(e) => setSelectedCommune(e.target.value)}
            disabled={!selectedDistrict}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Chọn phường/xã --</option>
            {communes.map((com) => (
              <option key={com.code} value={com.code}>
                {COMMUNE_TYPE_LABELS[com.type]} {com.name} ({com.code})
              </option>
            ))}
          </select>
          {commune && (
            <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
              <p className="font-medium">{commune.name_en}</p>
              <p className="text-gray-600">Loại: {COMMUNE_TYPE_LABELS[commune.type]}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
