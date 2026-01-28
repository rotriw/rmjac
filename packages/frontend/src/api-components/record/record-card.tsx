"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { RecordNodePublic } from "@rmjac/api-declare"
import { RecordStatusBadge } from "./record-status-badge"
import { Clock, Code } from "lucide-react"

interface RecordCardProps {
  record: RecordNodePublic
}

export function RecordCard({ record }: RecordCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <RecordStatusBadge status={record.record_status} />
          <span className="font-semibold">{record.record_score}</span>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-4">
            {record.code_language && (
                <span className="flex items-center gap-1">
                    <Code className="h-4 w-4" />
                    {record.code_language}
                </span>
            )}
            <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDate(record.record_time)}
            </span>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <p className="text-sm text-muted-foreground">{record.record_message}</p>
      </CardContent>
    </Card>
  )
}
