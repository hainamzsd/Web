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
  ExternalLink
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
  commune_supervisor: [
    {
      title: 'Tổng quan',
      items: [
        { title: 'Dashboard', href: '/supervisor/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Giám sát',
      items: [
        { title: 'Xem xét khảo sát', href: '/supervisor/reviews', icon: CheckSquare },
        { title: 'Bản đồ giám sát', href: '/supervisor/map', icon: Map },
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

const roleColors: Record<string, { gradient: string; accent: string }> = {
  commune_officer: { gradient: 'from-violet-600 to-indigo-700', accent: 'violet' },
  commune_supervisor: { gradient: 'from-teal-600 to-cyan-700', accent: 'teal' },
  central_admin: { gradient: 'from-blue-600 to-indigo-700', accent: 'blue' },
  system_admin: { gradient: 'from-slate-700 to-slate-900', accent: 'slate' },
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const navSections = roleNavSections[role] || []
  const colors = roleColors[role] || roleColors.commune_officer

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Logo & Brand */}
      <div className={`bg-gradient-to-r ${colors.gradient} px-5 py-5`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">C06 Platform</h2>
            <p className="text-xs text-white/70">Hệ thống Định danh Vị trí</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn(sectionIndex > 0 && 'mt-6')}>
            <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg shadow-${colors.accent}-500/20`
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className={cn(
                      'h-5 w-5 transition-transform duration-200',
                      !isActive && 'group-hover:scale-110'
                    )} />
                    <span className="flex-1">{item.title}</span>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    )}
                    {item.badge && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold">
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

      {/* Footer */}
      <div className="border-t border-slate-700/50 p-4">
        <a
          href="https://c06.gov.vn/support"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Hỗ trợ kỹ thuật</span>
          <ExternalLink className="ml-auto h-3 w-3" />
        </a>
        <div className="mt-3 px-3 text-[10px] text-slate-500">
          <p>Phiên bản 1.0.0</p>
          <p className="mt-0.5">© 2024 Bộ Công an Việt Nam</p>
        </div>
      </div>
    </div>
  )
}
