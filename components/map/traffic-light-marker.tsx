'use client'

/**
 * Traffic Light Marker Component
 *
 * Displays location identifier status as an animated traffic light.
 * ONLY surveys with status 'approved_central' that have a location_identifier
 * should be displayed as traffic lights.
 *
 * Traffic Light Status:
 * - GREEN: location_identifier is_active = TRUE (Active/Valid)
 * - RED: location_identifier is_active = FALSE (Deactivated/Invalid)
 *
 * Features:
 * - Realistic 3D traffic light appearance
 * - Animated glowing effect for active light
 * - Location identifier badge
 * - Pole with shadow effect
 */

export type TrafficLightStatus = 'green' | 'red'

export interface TrafficLightConfig {
  status: TrafficLightStatus
  locationId?: string | null
  pulseAnimation?: boolean
}

export interface LocationIdentifierData {
  location_id: string
  is_active: boolean
  deactivation_reason?: string | null
}

/**
 * Get traffic light status based on location identifier's is_active field
 * @param isActive - Whether the location identifier is active
 * @returns 'green' for active, 'red' for deactivated
 */
export function getTrafficLightStatus(isActive: boolean): TrafficLightStatus {
  return isActive ? 'green' : 'red'
}

export function getTrafficLightLabel(status: TrafficLightStatus): string {
  switch (status) {
    case 'green':
      return 'Đang hoạt động'
    case 'red':
      return 'Đã vô hiệu hóa'
  }
}

export function createTrafficLightIcon(config: TrafficLightConfig): string {
  const { status, locationId, pulseAnimation = true } = config

  // Light colors based on status (only green and red for location identifiers)
  const colors = {
    red: {
      active: status === 'red',
      on: '#ef4444',
      off: '#7f1d1d',
      glow: 'rgba(239, 68, 68, 0.6)'
    },
    green: {
      active: status === 'green',
      on: '#22c55e',
      off: '#14532d',
      glow: 'rgba(34, 197, 94, 0.6)'
    }
  }

  const animationStyle = pulseAnimation ? `
    @keyframes pulse-glow {
      0%, 100% { filter: drop-shadow(0 0 4px currentColor); }
      50% { filter: drop-shadow(0 0 12px currentColor) drop-shadow(0 0 20px currentColor); }
    }
  ` : ''

  return `
    <div class="traffic-light-marker" style="position: relative; width: 40px; height: 75px;">
      <style>${animationStyle}</style>

      <!-- Pole -->
      <div style="
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 6px;
        height: 25px;
        background: linear-gradient(90deg, #4b5563 0%, #9ca3af 50%, #4b5563 100%);
        border-radius: 0 0 3px 3px;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      "></div>

      <!-- Traffic Light Housing (2 lights only: green and red) -->
      <div style="
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 32px;
        height: 50px;
        background: linear-gradient(135deg, #374151 0%, #1f2937 50%, #111827 100%);
        border-radius: 6px;
        box-shadow:
          3px 3px 8px rgba(0,0,0,0.4),
          inset 1px 1px 2px rgba(255,255,255,0.1);
        padding: 6px 4px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
      ">
        <!-- Red Light (top) -->
        <div style="
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${colors.red.active ? colors.red.on : colors.red.off};
          box-shadow:
            ${colors.red.active ? `0 0 8px ${colors.red.glow}, 0 0 16px ${colors.red.glow}` : 'inset 2px 2px 4px rgba(0,0,0,0.5)'},
            inset -1px -1px 2px rgba(255,255,255,0.1);
          ${colors.red.active && pulseAnimation ? 'animation: pulse-glow 1.5s ease-in-out infinite; color: ' + colors.red.on + ';' : ''}
        "></div>

        <!-- Green Light (bottom) -->
        <div style="
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${colors.green.active ? colors.green.on : colors.green.off};
          box-shadow:
            ${colors.green.active ? `0 0 8px ${colors.green.glow}, 0 0 16px ${colors.green.glow}` : 'inset 2px 2px 4px rgba(0,0,0,0.5)'},
            inset -1px -1px 2px rgba(255,255,255,0.1);
          ${colors.green.active && pulseAnimation ? 'animation: pulse-glow 2s ease-in-out infinite; color: ' + colors.green.on + ';' : ''}
        "></div>
      </div>

      <!-- Hood/Visor -->
      <div style="
        position: absolute;
        top: -2px;
        left: 50%;
        transform: translateX(-50%);
        width: 36px;
        height: 8px;
        background: linear-gradient(180deg, #1f2937 0%, #374151 100%);
        border-radius: 4px 4px 0 0;
        box-shadow: 0 -2px 4px rgba(0,0,0,0.2);
      "></div>

      ${locationId ? `
        <!-- Location ID Badge -->
        <div style="
          position: absolute;
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          background: ${status === 'green' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'};
          color: white;
          font-size: 8px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          font-family: ui-monospace, monospace;
          letter-spacing: 0.5px;
        ">${locationId.length > 12 ? locationId.slice(-10) : locationId}</div>
      ` : ''}
    </div>
  `
}

export function createTrafficLightPopup(
  surveyName: string,
  surveyAddress: string,
  locationId: string,
  isActive: boolean,
  deactivationReason: string | null,
  detailUrl: string
): string {
  const lightStatus = getTrafficLightStatus(isActive)
  const statusLabel = getTrafficLightLabel(lightStatus)

  const statusColors = {
    green: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
    red: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
  }

  const color = statusColors[lightStatus]

  return `
    <div style="min-width: 240px; font-family: system-ui, sans-serif;">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
      ">
        <!-- Mini Traffic Light (2 lights) -->
        <div style="
          width: 24px;
          height: 40px;
          background: linear-gradient(135deg, #374151, #1f2937);
          border-radius: 4px;
          padding: 4px 3px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        ">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${lightStatus === 'red' ? '#ef4444' : '#7f1d1d'};${lightStatus === 'red' ? ' box-shadow: 0 0 6px rgba(239,68,68,0.6);' : ''}"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${lightStatus === 'green' ? '#22c55e' : '#14532d'};${lightStatus === 'green' ? ' box-shadow: 0 0 6px rgba(34,197,94,0.6);' : ''}"></div>
        </div>

        <div style="flex: 1; min-width: 0;">
          <h3 style="
            font-weight: 600;
            color: #111827;
            margin: 0 0 4px 0;
            font-size: 14px;
            line-height: 1.3;
          ">${surveyName || 'Chưa đặt tên'}</h3>

          <span style="
            display: inline-block;
            background: ${isActive ? '#dcfce7' : '#fee2e2'};
            color: ${isActive ? '#166534' : '#991b1b'};
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: ui-monospace, monospace;
          ">${locationId}</span>
        </div>
      </div>

      <!-- Status Badge -->
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: ${color.bg};
        color: ${color.text};
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid ${color.border};
        margin-bottom: 12px;
      ">
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${color.border};
        "></span>
        ${statusLabel}
      </div>

      ${!isActive && deactivationReason ? `
        <div style="
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 12px;
        ">
          <p style="
            font-size: 11px;
            color: #991b1b;
            margin: 0;
            line-height: 1.4;
          ">
            <strong>Lý do vô hiệu hóa:</strong><br/>
            ${deactivationReason}
          </p>
        </div>
      ` : ''}

      ${surveyAddress ? `
        <p style="
          font-size: 12px;
          color: #6b7280;
          margin: 0 0 12px 0;
          line-height: 1.4;
        ">${surveyAddress}</p>
      ` : ''}

      <a href="${detailUrl}" style="
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: ${isActive ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'};
        color: white;
        text-decoration: none;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 2px 4px ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(220, 38, 38, 0.3)'};
        transition: all 0.2s;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Xem chi tiết
      </a>
    </div>
  `
}
