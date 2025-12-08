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
  UserCog
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface SidebarProps {
  role: 'commune_officer' | 'commune_supervisor' | 'central_admin' | 'system_admin'
}

const roleNavItems: Record<string, NavItem[]> = {
  commune_officer: [
    { title: 'Dashboard', href: '/commune/dashboard', icon: LayoutDashboard },
    { title: 'Khảo sát', href: '/commune/surveys', icon: FileText },
    { title: 'Bản đồ', href: '/commune/map', icon: Map },
    { title: 'Báo cáo', href: '/commune/reports', icon: FileBarChart },
  ],
  commune_supervisor: [
    { title: 'Dashboard', href: '/supervisor/dashboard', icon: LayoutDashboard },
    { title: 'Xem xét', href: '/supervisor/reviews', icon: CheckSquare },
    { title: 'Lịch sử', href: '/supervisor/history', icon: History },
  ],
  central_admin: [
    { title: 'Dashboard', href: '/central/dashboard', icon: LayoutDashboard },
    { title: 'Khảo sát', href: '/central/surveys', icon: FileText },
    { title: 'Bản đồ QG', href: '/central/national-map', icon: Map },
    { title: 'Vị trí', href: '/central/locations', icon: MapPin },
    { title: 'Phê duyệt', href: '/central/approvals', icon: CheckSquare },
    { title: 'Phân tích', href: '/central/analytics', icon: BarChart3 },
    { title: 'Người dùng', href: '/central/users', icon: Users },
    { title: 'Cấu hình', href: '/central/config', icon: Settings },
  ],
  system_admin: [
    { title: 'Dashboard', href: '/central/dashboard', icon: LayoutDashboard },
    { title: 'Khảo sát', href: '/central/surveys', icon: FileText },
    { title: 'Bản đồ QG', href: '/central/national-map', icon: Map },
    { title: 'Vị trí', href: '/central/locations', icon: MapPin },
    { title: 'Phê duyệt', href: '/central/approvals', icon: CheckSquare },
    { title: 'Phân tích', href: '/central/analytics', icon: BarChart3 },
    { title: 'Người dùng', href: '/central/users', icon: Users },
    { title: 'Cấu hình', href: '/central/config', icon: Settings },
    { title: 'Quản trị', href: '/central/admin', icon: UserCog },
  ],
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const navItems = roleNavItems[role] || []

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900">C06 Platform</h2>
        <p className="text-sm text-gray-500 mt-1">Định danh Vị trí</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
