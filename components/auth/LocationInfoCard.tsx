'use client';

/**
 * Location Info Card Component
 *
 * Displays the officer's assigned location information on the web dashboard.
 * Shows ward/province name, scope level, and lock indicator.
 */

import React from 'react';
import { useLocationAccess } from '@/lib/auth/location-access-context';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface LocationInfoCardProps {
  /**
   * Display variant
   */
  variant?: 'badge' | 'card' | 'inline';

  /**
   * Show scope level
   */
  showScope?: boolean;

  /**
   * Show lock indicator
   */
  showLock?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

// =============================================================================
// SCOPE LEVEL CONFIG
// =============================================================================

const SCOPE_CONFIG = {
  ward: {
    label: 'Cấp xã/phường',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🏘️',
  },
  province: {
    label: 'Cấp tỉnh/thành phố',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: '🏛️',
  },
  admin: {
    label: 'Quản trị viên',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: '👑',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function LocationInfoCard({
  variant = 'card',
  showScope = true,
  showLock = true,
  className,
}: LocationInfoCardProps) {
  const { assignedLocation, isLoading, error } = useLocationAccess();

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'animate-pulse bg-gray-100 rounded-lg',
          variant === 'badge' ? 'h-8 w-32' : 'h-24 w-full',
          className
        )}
      />
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm',
          className
        )}
      >
        ⚠️ {error}
      </div>
    );
  }

  // No location assigned
  if (!assignedLocation) {
    return (
      <div
        className={cn(
          'bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm',
          className
        )}
      >
        ⚠️ Tài khoản chưa được phân công khu vực
      </div>
    );
  }

  const scopeConfig = SCOPE_CONFIG[assignedLocation.scopeLevel];

  // Badge variant
  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border',
          scopeConfig.color,
          className
        )}
      >
        {showLock && assignedLocation.scopeLevel !== 'admin' && (
          <span className="text-xs">🔒</span>
        )}
        <span className="font-medium text-sm">
          {assignedLocation.scopeLevel === 'admin'
            ? 'Toàn quốc'
            : assignedLocation.wardName || assignedLocation.provinceName}
        </span>
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <span>{scopeConfig.icon}</span>
        <span className="text-gray-600">Khu vực:</span>
        <span className="font-semibold text-gray-900">
          {assignedLocation.scopeLevel === 'admin'
            ? 'Toàn quốc'
            : assignedLocation.wardName || assignedLocation.wardCode}
        </span>
        {showLock && assignedLocation.scopeLevel !== 'admin' && (
          <span className="text-gray-400">🔒</span>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        {showScope && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded',
              scopeConfig.color
            )}
          >
            {scopeConfig.label}
          </span>
        )}
        {showLock && assignedLocation.scopeLevel !== 'admin' && (
          <div className="flex items-center gap-1 text-gray-500">
            <span className="text-sm">🔒</span>
            <span className="text-xs">Khóa vị trí</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {assignedLocation.scopeLevel === 'admin' ? (
          <p className="text-lg font-bold text-gray-900">Toàn quốc</p>
        ) : (
          <>
            {assignedLocation.wardName && (
              <p className="text-lg font-bold text-gray-900">
                {assignedLocation.wardName}
              </p>
            )}
            {assignedLocation.districtName && (
              <p className="text-sm text-gray-600">{assignedLocation.districtName}</p>
            )}
            {assignedLocation.provinceName && (
              <p className="text-sm text-gray-500">{assignedLocation.provinceName}</p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {assignedLocation.scopeLevel !== 'admin' && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <p className="text-xs text-blue-700">
            ℹ️ Bạn chỉ có thể xem và chỉnh sửa khảo sát trong khu vực được phân công
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LOCATION CODE DISPLAY
// =============================================================================

interface LocationCodeDisplayProps {
  className?: string;
  showLabels?: boolean;
}

export function LocationCodeDisplay({
  className,
  showLabels = true,
}: LocationCodeDisplayProps) {
  const { assignedLocation } = useLocationAccess();

  if (!assignedLocation) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200',
        className
      )}
    >
      <div className="flex-1 text-center">
        {showLabels && (
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Tỉnh/TP
          </p>
        )}
        <div className="flex items-center justify-center gap-1">
          <code className="font-mono text-sm font-semibold text-gray-800">
            {assignedLocation.provinceCode || '-'}
          </code>
          <span className="text-gray-400 text-xs">🔒</span>
        </div>
      </div>

      <div className="w-px h-8 bg-gray-300" />

      <div className="flex-1 text-center">
        {showLabels && (
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Quận/Huyện
          </p>
        )}
        <div className="flex items-center justify-center gap-1">
          <code className="font-mono text-sm font-semibold text-gray-800">
            {assignedLocation.districtCode || '-'}
          </code>
          <span className="text-gray-400 text-xs">🔒</span>
        </div>
      </div>

      <div className="w-px h-8 bg-gray-300" />

      <div className="flex-1 text-center">
        {showLabels && (
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Xã/Phường
          </p>
        )}
        <div className="flex items-center justify-center gap-1">
          <code className="font-mono text-sm font-semibold text-gray-800">
            {assignedLocation.wardCode || '-'}
          </code>
          <span className="text-gray-400 text-xs">🔒</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ACCESS DENIED COMPONENT
// =============================================================================

interface AccessDeniedProps {
  message?: string;
  className?: string;
}

export function AccessDenied({ message, className }: AccessDeniedProps) {
  const { assignedLocation } = useLocationAccess();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg',
        className
      )}
    >
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">🚫</span>
      </div>
      <h3 className="text-lg font-bold text-red-800 mb-2">
        Không có quyền truy cập
      </h3>
      <p className="text-sm text-red-600 text-center mb-4">
        {message || 'Khảo sát này nằm ngoài khu vực bạn được phân công'}
      </p>
      {assignedLocation && (
        <p className="text-xs text-gray-600">
          Khu vực của bạn:{' '}
          <strong>
            {assignedLocation.wardName || assignedLocation.provinceName}
          </strong>
        </p>
      )}
    </div>
  );
}

export default LocationInfoCard;
