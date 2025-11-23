import { cn } from "@/lib/utils/cn"
import { STATUS_COLORS, STATUS_LABELS, SurveyStatus, isSurveyStatus } from "@/lib/utils/constants"

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Validate and cast status
  const validStatus = isSurveyStatus(status) ? status : 'pending';

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[validStatus as SurveyStatus],
        className
      )}
    >
      {STATUS_LABELS[validStatus as SurveyStatus]}
    </span>
  )
}
