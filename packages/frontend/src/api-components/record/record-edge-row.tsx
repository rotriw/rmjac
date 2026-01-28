"use client"

import Link from "next/link"
import { RecordEdge } from "@rmjac/api-declare"
import { RecordStatusBadge } from "./record-status-badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { Clock, Code, Award } from "lucide-react"

interface RecordEdgeRowProps {
  edge: RecordEdge
  problemIden?: string
  problemName?: string
  userIden?: string
  userName?: string
  showUser?: boolean
  showProblem?: boolean
  onClick?: () => void
}

export function RecordEdgeRow({
  edge,
  problemIden,
  problemName,
  userIden,
  userName,
  showUser = false,
  showProblem = false,
  onClick,
}: RecordEdgeRowProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <TableRow
      className="hover:bg-gray-50/50 cursor-pointer"
      onClick={onClick}
    >
      <TableCell className="w-32">
        <RecordStatusBadge status={edge.record_status} />
      </TableCell>

      {showProblem && (
        <TableCell>
          {problemIden ? (
            <Link
              href={`/problem/${problemIden}`}
              className="text-blue-600 hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {problemName || problemIden}
            </Link>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </TableCell>
      )}

      {showUser && (
        <TableCell>
          {userIden ? (
            <Link
              href={`/user/${userIden}`}
              className="text-gray-700 hover:text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {userName || userIden}
            </Link>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </TableCell>
      )}

      <TableCell className="w-20 text-center">
        <div className="flex items-center justify-center gap-1">
          <Award className="w-3.5 h-3.5 text-yellow-600" />
          <span className="font-semibold">{edge.score}</span>
        </div>
      </TableCell>

      {edge.platform && (
        <TableCell className="w-24">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Code className="w-3.5 h-3.5" />
            <span>{edge.platform}</span>
          </div>
        </TableCell>
      )}

      <TableCell className="w-32 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(edge.submit_time)}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}
