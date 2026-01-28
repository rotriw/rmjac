"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrainingNodePublic } from "@rmjac/api-declare"
import { Calendar } from "lucide-react"

interface TrainingCardProps {
  training: TrainingNodePublic
}

export function TrainingCard({ training }: TrainingCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <Card className="hover:bg-muted/50 transition-colors h-full">
      <CardHeader>
        <CardTitle>{training.name}</CardTitle>
        <CardDescription>{training.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <span className="font-semibold">Type:</span> {training.training_type}
            </div>
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(training.start_time)} - {formatDate(training.end_time)}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
