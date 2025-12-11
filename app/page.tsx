'use client'

import Link from "next/link"
import dynamic from "next/dynamic"
import { MapPin, Shield, BarChart3, ArrowRight, Sparkles, MousePointer2, Type } from "lucide-react"
import { useState, useEffect } from "react"

// Dynamic import to avoid SSR issues with Three.js
const VietnamParticleMap = dynamic(
  () => import('@/components/welcome/vietnam-particle-map'),
  { ssr: false }
)

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [isMapInteractive, setIsMapInteractive] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
      {/* Particle Map Background */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${isMapInteractive ? 'opacity-90 z-20' : 'opacity-60 z-0'}`}>
        {mounted && <VietnamParticleMap interactiveMode={isMapInteractive} />}
      </div>

      {/* Gradient Overlay - pointer-events-none so map can be interacted with */}
      <div className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50 pointer-events-none transition-opacity duration-300 ${isMapInteractive ? 'opacity-30 z-[19]' : 'z-[1]'}`} />

      {/* Interactive Mode Toggle Button - Always on top */}
      <button
        onClick={() => setIsMapInteractive(!isMapInteractive)}
        className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${isMapInteractive
          ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
          : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
          }`}
        title={isMapInteractive ? 'Switch to Normal Mode' : 'Switch to Interactive Mode'}
      >
        {isMapInteractive ? (
          <>
            <Type className="w-4 h-4" />
            <span className="text-xs font-medium">Labels</span>
          </>
        ) : (
          <>
            <MousePointer2 className="w-4 h-4" />
            <span className="text-xs font-medium">Interact</span>
          </>
        )}
      </button>

      {/* Interactive mode indicator */}
      {isMapInteractive && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
          <span className="text-red-400 text-xs font-medium">Interactive Mode - Move your cursor to interact</span>
        </div>
      )}

      {/* Content */}
      <div className={`relative flex min-h-screen flex-col items-center justify-center p-6 md:p-12 transition-all duration-300 ${isMapInteractive ? 'opacity-20 pointer-events-none z-10' : 'z-10'}`}>
        <div className="max-w-5xl w-full text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm mb-8">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Nền tảng Quản lý Địa điểm Quốc gia</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-white via-red-200 to-yellow-200 bg-clip-text text-transparent">
              Hệ thống Định danh
            </span>
            <br />
            <span className="text-white">Vị trí Quốc gia</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 mb-4">
            Cục Cảnh sát Quản lý Hành chính về Trật tự Xã hội - <span className="text-red-400 font-semibold">C06</span>
          </p>

          <p className="text-slate-400 mb-12 max-w-2xl mx-auto">
            Nền tảng quản lý và chuẩn hóa thông tin địa điểm trên phạm vi toàn quốc,
            phục vụ công tác quản lý hành chính và an ninh trật tự
          </p>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12">
            <Link
              href="/login"
              className="group relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:bg-white/10 hover:border-blue-400/50 hover:scale-[1.02]"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <MapPin className="w-7 h-7 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Cán bộ Xã/Phường
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Tiếp nhận và xử lý phiếu khảo sát từ ứng dụng di động
                </p>
                <div className="flex items-center justify-center gap-2 text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Truy cập</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link
              href="/login"
              className="group relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:bg-white/10 hover:border-orange-400/50 hover:scale-[1.02]"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7 text-orange-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Giám sát viên
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Kiểm tra và phê duyệt đề xuất từ cán bộ cấp xã/phường
                </p>
                <div className="flex items-center justify-center gap-2 text-orange-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Truy cập</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link
              href="/login"
              className="group relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:bg-white/10 hover:border-red-400/50 hover:scale-[1.02]"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Quản trị Trung ương
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Quản lý toàn quốc, cấp mã định danh và thống kê báo cáo
                </p>
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Truy cập</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-red-500 hover:to-red-400 transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105"
            >
              Đăng nhập hệ thống
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/tracuu"
              className="group inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 hover:border-white/40 transition-all"
            >
              <MapPin className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform" />
              Tra cứu Mã định danh
            </Link>
          </div>

          {/* Stats Bar */}
          {/* <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">63</div>
              <div className="text-xs text-slate-400">Tỉnh/Thành phố</div>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="text-2xl md:text-3xl font-bold text-white">10K+</div>
              <div className="text-xs text-slate-400">Địa điểm</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">24/7</div>
              <div className="text-xs text-slate-400">Hoạt động</div>
            </div>
          </div> */}

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-xs text-slate-500">
              © 2025 Bộ Công an Việt Nam. Bản quyền được bảo lưu.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
