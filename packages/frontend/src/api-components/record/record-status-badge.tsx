"use client"

import { Badge } from "@/components/ui/badge"
import { RecordStatus } from "@rmjac/api-declare"
import { RECORD_STATUS_COLOR_MAP_INTER, Icond } from "./status-utils"
import { cn } from "@/lib/utils"

interface RecordStatusBadgeProps {
  status: RecordStatus
  showIcon?: boolean
}

export function RecordStatusBadge({ status, showIcon = false }: RecordStatusBadgeProps) {
  const backgroundColor = RECORD_STATUS_COLOR_MAP_INTER[status];
  const textColor = 'text-white'; // Assuming dark background needs white text

  return (
    <Badge
      className={cn(
        "border-transparent",
        textColor
      )}
      style={{ backgroundColor }}
    >
      {showIcon && <Icond status={status} size={3} className="mr-1" />}
      {status}
    </Badge>
  )
}
