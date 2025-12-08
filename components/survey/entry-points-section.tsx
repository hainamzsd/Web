'use client';

/**
 * EntryPointsSection - Display entry points for a survey location
 * Used in survey detail pages to show all entry/access points
 */

import React from 'react';
import {
  EntryPoint,
  EntryPointType,
  ENTRY_TYPE_LABELS,
  DIRECTION_LABELS,
  getEntryPointColor,
} from '@/lib/types/entry-points';
import {
  DoorOpen,
  DoorClosed,
  Truck,
  AlertTriangle,
  Footprints,
  Car,
  LogIn,
  Star,
  MapPin,
  Compass,
} from 'lucide-react';

interface EntryPointsSectionProps {
  entryPoints: EntryPoint[];
  className?: string;
}

/**
 * Get icon component for entry type
 */
function getEntryTypeIconComponent(type: EntryPointType) {
  const iconProps = { className: 'h-4 w-4' };
  switch (type) {
    case 'main_gate':
      return <DoorOpen {...iconProps} />;
    case 'side_gate':
      return <DoorClosed {...iconProps} />;
    case 'service_entrance':
      return <Truck {...iconProps} />;
    case 'emergency_exit':
      return <AlertTriangle {...iconProps} />;
    case 'pedestrian':
      return <Footprints {...iconProps} />;
    case 'vehicle':
      return <Car {...iconProps} />;
    default:
      return <LogIn {...iconProps} />;
  }
}

export function EntryPointsSection({ entryPoints, className = '' }: EntryPointsSectionProps) {
  if (!entryPoints || entryPoints.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <LogIn className="h-4 w-4" />
          Lối vào
        </h3>
        <p className="text-sm text-gray-500 italic">Chưa có thông tin lối vào</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <LogIn className="h-4 w-4" />
        Lối vào ({entryPoints.length})
      </h3>

      <div className="space-y-3">
        {entryPoints.map((ep) => (
          <EntryPointCard key={ep.id} entryPoint={ep} />
        ))}
      </div>
    </div>
  );
}

interface EntryPointCardProps {
  entryPoint: EntryPoint;
}

function EntryPointCard({ entryPoint }: EntryPointCardProps) {
  const {
    sequenceNumber,
    entryType,
    isPrimary,
    latitude,
    longitude,
    houseNumber,
    street,
    facingDirection,
    notes,
  } = entryPoint;

  return (
    <div
      className={`rounded-lg border p-3 ${
        isPrimary
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
              isPrimary
                ? 'bg-green-600 text-white'
                : 'bg-gray-400 text-white'
            }`}
          >
            {sequenceNumber}
          </span>
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {getEntryTypeIconComponent(entryType)}
            {ENTRY_TYPE_LABELS[entryType]}
          </span>
        </div>

        {isPrimary && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
            <Star className="h-3 w-3" />
            Lối vào chính
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm text-gray-600">
        {/* Coordinates */}
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>

        {/* Address if available */}
        {(houseNumber || street) && (
          <div className="flex items-start gap-1">
            <DoorOpen className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
            <span>
              {[houseNumber, street].filter(Boolean).join(', ')}
            </span>
          </div>
        )}

        {/* Facing direction if available */}
        {facingDirection && (
          <div className="flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-gray-400" />
            <span>Hướng: {DIRECTION_LABELS[facingDirection]}</span>
          </div>
        )}

        {/* Notes if available */}
        {notes && (
          <div className="mt-2 p-2 bg-white rounded border border-gray-100 text-xs text-gray-500">
            {notes}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact view for entry points (for list views)
 */
interface EntryPointsCompactProps {
  entryPoints: EntryPoint[];
  className?: string;
}

export function EntryPointsCompact({ entryPoints, className = '' }: EntryPointsCompactProps) {
  if (!entryPoints || entryPoints.length === 0) {
    return (
      <span className="text-sm text-gray-400 italic">Không có lối vào</span>
    );
  }

  const primary = entryPoints.find((ep) => ep.isPrimary);
  const others = entryPoints.filter((ep) => !ep.isPrimary);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {primary && (
        <span className="inline-flex items-center gap-1 text-sm text-green-700">
          {getEntryTypeIconComponent(primary.entryType)}
          {ENTRY_TYPE_LABELS[primary.entryType]}
        </span>
      )}
      {others.length > 0 && (
        <span className="text-sm text-gray-500">
          +{others.length} lối khác
        </span>
      )}
    </div>
  );
}

/**
 * Badge showing entry point count
 */
interface EntryPointsBadgeProps {
  count: number;
  className?: string;
}

export function EntryPointsBadge({ count, className = '' }: EntryPointsBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded ${className}`}
    >
      <LogIn className="h-3 w-3" />
      {count} lối vào
    </span>
  );
}

export default EntryPointsSection;
