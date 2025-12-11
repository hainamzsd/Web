'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Search, Home, X, CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react'
import type { HighlightLocation } from '@/components/citizen/vietnam-space-map'

// Dynamic import
const VietnamSpaceMap = dynamic(
  () => import('@/components/citizen/vietnam-space-map'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900" />
    )
  }
)

interface LocationData {
  locationId: string
  isActive: boolean
  assignedAt: string
  locationName?: string
  address?: string
  latitude?: number
  longitude?: number
  province?: string
  ward?: string
}

interface LookupResult {
  found: boolean
  location?: LocationData
  message?: string
  suggestions?: { locationId: string; isActive: boolean }[]
}

export default function CitizenLookupPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [highlightLocation, setHighlightLocation] = useState<HighlightLocation | null>(null)
  const [showSearch, setShowSearch] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setResult(null)
    setHighlightLocation(null)

    try {
      const response = await fetch(`/api/lookup?id=${encodeURIComponent(searchQuery.trim())}`)
      const data = await response.json()

      setResult(data)

      if (data.found && data.location?.latitude && data.location?.longitude) {
        setHighlightLocation({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          locationId: data.location.locationId,
          locationName: data.location.locationName || data.location.locationId
        })
      }
    } catch (error) {
      setResult({
        found: false,
        message: 'Lỗi kết nối. Vui lòng thử lại sau.'
      })
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') setShowSearch(false)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setResult(null)
    setHighlightLocation(null)
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
      {/* Full-screen Three.js Map */}
      <div className="absolute inset-0">
        {mounted && <VietnamSpaceMap highlightLocation={highlightLocation} />}
      </div>

      {/* Top Navigation */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
        <Link
          href="/"
          className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all"
        >
          <Home className="h-5 w-5" />
        </Link>

        <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600/20 to-orange-600/20 backdrop-blur-md border border-red-500/20">
          <span className="text-red-400 text-sm font-medium">Bản đồ Định danh Quốc gia</span>
        </div>
      </div>

      {/* Search Toggle */}
      <button
        onClick={() => setShowSearch(!showSearch)}
        className={`absolute top-4 right-4 z-50 p-3 rounded-xl backdrop-blur-md border transition-all ${
          showSearch
            ? 'bg-red-500/20 border-red-500/30 text-red-400'
            : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
        }`}
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Search Panel */}
      {showSearch && (
        <div className="absolute top-20 right-4 z-50 w-80 animate-in slide-in-from-right-4 duration-300">
          {/* Search Input */}
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập mã định danh..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 font-mono text-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="w-full mt-3 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Tra cứu
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {result && (
              <div className="p-4">
                {result.found && result.location ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Tìm thấy!</span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-red-400" />
                        <span className="font-mono text-white text-sm">{result.location.locationId}</span>
                      </div>

                      {result.location.locationName && (
                        <p className="text-white/80 text-sm">{result.location.locationName}</p>
                      )}

                      {result.location.address && (
                        <p className="text-white/50 text-xs">{result.location.address}</p>
                      )}

                      {(result.location.ward || result.location.province) && (
                        <p className="text-white/40 text-xs">
                          {[result.location.ward, result.location.province].filter(Boolean).join(', ')}
                        </p>
                      )}

                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        result.location.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {result.location.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                      </div>
                    </div>

                    <p className="text-white/40 text-xs text-center">
                      Bản đồ đã zoom đến vị trí
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium text-sm">Không tìm thấy</span>
                    </div>

                    {result.suggestions && result.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-white/50 text-xs">Gợi ý:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSearchQuery(s.locationId)
                                setTimeout(handleSearch, 100)
                              }}
                              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-mono"
                            >
                              {s.locationId}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-white/40 text-xs">
                      {result.message || 'Mã định danh không tồn tại trong hệ thống.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 text-xs text-white/60">
        <p className="text-white/80 font-medium mb-2">Chú thích</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Ranh giới tỉnh</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span>Vị trí tra cứu</span>
          </div>
        </div>
      </div>
    </main>
  )
}
