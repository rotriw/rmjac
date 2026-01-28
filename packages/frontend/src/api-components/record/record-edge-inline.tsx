"use client"

import { RecordEdge } from "@rmjac/api-declare"
import { RecordStatusBadge } from "./record-status-badge"
import { Badge } from "@/components/ui/badge"
import { Clock, Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface RecordEdgeInlineProps {
  edge: RecordEdge
  className?: string
}

export function RecordEdgeInline({ edge, className }: RecordEdgeInlineProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <RecordStatusBadge status={edge.record_status} />
      
      <Badge variant="outline" className="gap-1">
        <Award className="w-3 h-3 text-yellow-600" />
        {edge.score}
      </Badge>

      {edge.platform && (
        <Badge variant="secondary" className="text-xs">
          {edge.platform}
        </Badge>
      )}

      <span className="text-xs text-gray-500 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {formatDate(edge.submit_time)}
      </span>
    </div>
  )
}
