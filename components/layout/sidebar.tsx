'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  FileText,
  Map,
  FileBarChart,
  Users,
  Settings,
  CheckSquare,
  History,
  MapPin,
  BarChart3,
  UserCog,
  Globe,
  Shield,
  ChevronRight,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Zap
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

interface SidebarProps {
  role: 'commune_officer' | 'commune_supervisor' | 'central_admin' | 'system_admin'
}

const roleNavSections: Record<string, NavSection[]> = {
  // Xã (Commune) - Chỉ xem thống kê và bản đồ survey đã tạo
  commune_officer: [
    {
      title: 'Tổng quan',
      items: [
        { title: 'Dashboard', href: '/commune/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Quản lý khảo sát',
      items: [
        { title: 'Danh sách khảo sát', href: '/commune/surveys', icon: FileText },
        { title: 'Bản đồ vị trí', href: '/commune/map', icon: Map },
      ]
    },
    {
      title: 'Báo cáo',
      items: [
        { title: 'Thống kê', href: '/commune/reports', icon: FileBarChart },
      ]
    }
  ],
  // Tỉnh (Province) - Phê duyệt survey từ các xã trong tỉnh
  commune_supervisor: [
    {
      title: 'Tổng quan',
      items: [
        { title: 'Dashboard', href: '/supervisor/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Phê duyệt cấp Tỉnh',
      items: [
        { title: 'Chờ phê duyệt', href: '/supervisor/reviews', icon: CheckSquare },
        { title: 'Bản đồ tỉnh', href: '/supervisor/map', icon: Map },
      ]
    },
    {
      title: 'Lịch sử',
      items: [
        { title: 'Nhật ký hoạt động', href: '/supervisor/history', icon: History },
      ]
    }
  ],
  central_admin: [
    {
      title: 'Tổng quan',
      items: [
        { title: 'Dashboard', href: '/central/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Quản lý dữ liệu',
      items: [
        { title: 'Khảo sát toàn quốc', href: '/central/surveys', icon: FileText },
        { title: 'Bản đồ quốc gia', href: '/central/map', icon: Globe },
        { title: 'Quản lý vị trí', href: '/central/locations', icon: MapPin },
      ]
    },
    {
      title: 'Phê duyệt & Phân tích',
      items: [
        { title: 'Phê duyệt', href: '/central/approvals', icon: CheckSquare },
        { title: 'Phân tích dữ liệu', href: '/central/analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'Quản trị',
      items: [
        { title: 'Người dùng', href: '/central/users', icon: Users },
        { title: 'Cấu hình hệ thống', href: '/central/config', icon: Settings },
      ]
    }
  ],
  system_admin: [
    {
      title: 'Tổng quan',
      items: [
        { title: 'Dashboard', href: '/central/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Quản lý dữ liệu',
      items: [
        { title: 'Khảo sát toàn quốc', href: '/central/surveys', icon: FileText },
        { title: 'Bản đồ quốc gia', href: '/central/map', icon: Globe },
        { title: 'Quản lý vị trí', href: '/central/locations', icon: MapPin },
      ]
    },
    {
      title: 'Phê duyệt & Phân tích',
      items: [
        { title: 'Phê duyệt', href: '/central/approvals', icon: CheckSquare },
        { title: 'Phân tích dữ liệu', href: '/central/analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'Quản trị hệ thống',
      items: [
        { title: 'Người dùng', href: '/central/users', icon: Users },
        { title: 'Cấu hình', href: '/central/config', icon: Settings },
        { title: 'Quản trị nâng cao', href: '/central/admin', icon: UserCog },
      ]
    }
  ],
}

const roleConfig: Record<string, { gradient: string; accent: string; glow: string; iconBg: string }> = {
  commune_officer: {
    gradient: 'from-violet-600 to-indigo-700',
    accent: 'violet',
    glow: 'shadow-violet-500/20',
    iconBg: 'bg-violet-500/20'
  },
  commune_supervisor: {
    gradient: 'from-teal-600 to-cyan-700',
    accent: 'teal',
    glow: 'shadow-teal-500/20',
    iconBg: 'bg-teal-500/20'
  },
  central_admin: {
    gradient: 'from-indigo-600 to-purple-700',
    accent: 'indigo',
    glow: 'shadow-indigo-500/20',
    iconBg: 'bg-indigo-500/20'
  },
  system_admin: {
    gradient: 'from-slate-600 to-slate-800',
    accent: 'slate',
    glow: 'shadow-slate-500/20',
    iconBg: 'bg-slate-500/20'
  },
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const navSections = roleNavSections[role] || []
  const config = roleConfig[role] || roleConfig.commune_officer

  return (
    <div className="flex h-full w-72 flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo & Brand */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${config.gradient} px-6 py-6`}>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">C06</h2>
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </div>
            <p className="text-xs text-white/70">Hệ thống Định danh Vị trí</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {navSections.map((section, sectionIndex) => (
          <div key={section.title}>
            <h3 className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                      isActive
                        ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg ${config.glow}`
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-white/50" />
                    )}

                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-white/20'
                        : `${config.iconBg} group-hover:bg-slate-700`
                    )}>
                      <Icon className={cn(
                        'h-5 w-5 transition-transform duration-200',
                        !isActive && 'group-hover:scale-110'
                      )} />
                    </div>

                    <span className="flex-1">{item.title}</span>

                    {isActive && (
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    )}

                    {item.badge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Quick Action Card */}
      <div className="px-4 pb-4">
        <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${config.gradient} p-4`}>
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-semibold text-white">Truy cập nhanh</span>
            </div>
            <p className="text-xs text-white/70 mb-3">Xem báo cáo và phê duyệt khảo sát mới</p>
            <Link
              href="/central/approvals"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
            >
              Phê duyệt ngay
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <a
          href="https://c06.gov.vn/support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-slate-500 transition-all hover:bg-slate-800/50 hover:text-slate-300"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Hỗ trợ kỹ thuật</span>
          <ExternalLink className="ml-auto h-3 w-3" />
        </a>
        <div className="mt-3 px-4 text-[10px] text-slate-600">
          <p>Phiên bản 2.0.0</p>
          <p className="mt-0.5">© 2025 Bộ Công an Việt Nam</p>
        </div>
      </div>
    </div>
  )
}
