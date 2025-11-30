'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, ChevronRight } from 'lucide-react'
import {
  AdministrativeService,
  ApiProvince,
  ApiWard
} from '@/lib/map/administrative-service'

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
  const [provinces, setProvinces] = useState<ApiProvince[]>([])
  const [communes, setCommunes] = useState<ApiWard[]>([])

  const [selectedProvince, setSelectedProvince] = useState(initialProvince || '')
  // We keep district in signature but ignore it in UI
  const [selectedCommune, setSelectedCommune] = useState(initialCommune || '')

  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCommunes, setLoadingCommunes] = useState(false)

  // Fetch Provinces on Mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true)
      const data = await AdministrativeService.getProvinces()
      setProvinces(data)
      setLoadingProvinces(false)
    }
    fetchProvinces()
  }, [])

  // Fetch Communes (Wards) when Province changes
  useEffect(() => {
    if (!selectedProvince) {
      setCommunes([])
      return
    }
    const fetchCommunes = async () => {
      setLoadingCommunes(true)
      // Fetch all wards for the province directly
      const data = await AdministrativeService.getWardsByProvince(selectedProvince)
      setCommunes(data)
      setLoadingCommunes(false)
    }
    fetchCommunes()
  }, [selectedProvince])

  // Notify parent of changes
  useEffect(() => {
    if (onSelect) {
      // Pass empty string for district
      onSelect(
        String(selectedProvince),
        '',
        String(selectedCommune)
      )
    }
  }, [selectedProvince, selectedCommune, onSelect])

  const handleProvinceChange = (code: string) => {
    setSelectedProvince(code)
    setSelectedCommune('')
  }

  const currentProvince = provinces.find(p => String(p.code) === String(selectedProvince))
  const currentCommune = communes.find(c => String(c.code) === String(selectedCommune))

  return (
    <div className="space-y-4">
      {showFullPath && (selectedProvince || selectedCommune) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Vị trí đã chọn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {currentProvince && (
                <>
                  <span className="font-medium text-blue-600">{currentProvince.name}</span>
                  {currentCommune && <ChevronRight className="h-4 w-4 text-gray-400" />}
                </>
              )}
              {currentCommune && (
                <span className="font-medium text-purple-600">
                  {currentCommune.name}
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Mã định danh: {selectedProvince && `${selectedProvince}-...-${selectedCommune || '...'}`}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Province Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tỉnh/Thành phố
          </label>
          <select
            value={selectedProvince}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={loadingProvinces}
          >
            <option value="">-- Chọn tỉnh/thành phố --</option>
            {provinces.map((prov) => (
              <option key={prov.code} value={prov.code}>
                {prov.name}
              </option>
            ))}
          </select>
          {loadingProvinces && <p className="text-xs text-gray-500 mt-1">Đang tải...</p>}
          {currentProvince && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
              <p className="font-medium">{currentProvince.codename}</p>
              <p className="text-gray-600">Mã vùng ĐT: {currentProvince.phone_code}</p>
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
            disabled={!selectedProvince || loadingCommunes}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Chọn phường/xã --</option>
            {communes.map((com) => (
              <option key={com.code} value={com.code}>
                {com.name}
              </option>
            ))}
          </select>
          {loadingCommunes && <p className="text-xs text-gray-500 mt-1">Đang tải...</p>}
          {currentCommune && (
            <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
              <p className="font-medium">{currentCommune.codename}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
