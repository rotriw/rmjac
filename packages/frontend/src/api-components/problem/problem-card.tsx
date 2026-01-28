"use client"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ProblemNodePublic } from "@rmjac/api-declare"
import { Calendar } from "lucide-react"

interface ProblemCardProps {
  problem: ProblemNodePublic
  onClick?: () => void
}

export function ProblemCard({ problem, onClick }: ProblemCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <Card 
      className={`hover:bg-muted/50 transition-colors ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{problem.name}</span>
          <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(problem.creation_time)}
          </span>
        </CardTitle>
      </CardHeader>
    </Card>
  )
}
