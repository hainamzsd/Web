'use client'

import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Shield, Sparkles, MousePointer2, Type } from 'lucide-react'
import { useState, useEffect } from 'react'

const VietnamParticleMap = dynamic(
  () => import('@/components/welcome/vietnam-particle-map'),
  { ssr: false }
)

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [isMapInteractive, setIsMapInteractive] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
      {/* Particle Map Background */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${isMapInteractive ? 'opacity-90 z-20' : 'opacity-30 z-0'}`}>
        {mounted && <VietnamParticleMap interactiveMode={isMapInteractive} />}
      </div>

      {/* Gradient Overlays */}
      <div className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/70 pointer-events-none transition-opacity duration-300 ${isMapInteractive ? 'opacity-30' : ''}`} />
      <div className={`absolute inset-0 bg-gradient-to-r from-slate-900/50 via-transparent to-slate-900/50 pointer-events-none transition-opacity duration-300 ${isMapInteractive ? 'opacity-30' : ''}`} />

      {/* Interactive Mode Toggle Button - Always on top */}
      <button
        onClick={() => setIsMapInteractive(!isMapInteractive)}
        className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border transition-all duration-300 ${
          isMapInteractive
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
      <div className={`relative flex min-h-screen items-center justify-center p-4 transition-all duration-300 ${isMapInteractive ? 'opacity-20 pointer-events-none z-10' : 'z-10'}`}>
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-8 text-slate-400 text-sm hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Quay về trang chủ
          </Link>

          {/* Header */}
          <div className="mb-8 text-center">
            {/* Logo/Badge */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/30 mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Hệ thống Định danh Vị trí
            </h1>
            <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>Cục C06 - Bộ Công an</span>
            </div>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 mt-8">
            © 2025 Bộ Công an Việt Nam. Bản quyền được bảo lưu.
          </p>
        </div>
      </div>
    </div>
  )
}
