"use client"

import * as React from "react"
import { useState } from "react"
import { TitleCard } from "@/components/card/card"
import { TrainingRightSidebar } from "./training-right-sidebar"
import { Badge } from "@/components/ui/badge"
import TrainingSubmissions from "./training-submissions"
import { TrainingProblem } from "@rmjac/api-declare"

interface TrainingContainerProps {
  userIden: string
  trainingIden: string
  trainingName: string
  trainingType: string
  startTime: string
  endTime: string
  trainingNodeId: number
  initialPinned?: boolean
  hasEditPermission: boolean
  completedCount: number
  totalCount: number
  problems: TrainingProblem[]
  statusMap: Map<number, string>
  children?: React.ReactNode
}

export default function TrainingContainer({
  userIden,
  trainingIden,
  trainingName,
  trainingType,
  startTime,
  endTime,
  trainingNodeId,
  initialPinned,
  hasEditPermission,
  completedCount,
  totalCount,
  problems,
  statusMap,
  children
}: TrainingContainerProps) {
  const [viewMode, setViewMode] = useState<"problems" | "submissions">("problems")
  const [selectedProblemId, setSelectedProblemId] = useState<string>("")

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0">
      <div className="flex-1 w-full py-6 px-4 md:px-6 lg:overflow-y-auto">
        {viewMode === "problems" ? (
          <div className="animate-in fade-in duration-300">
            <TitleCard
              title={trainingName}
              description={`ID: ${trainingIden}`}
            >
              <div className="flex gap-2 mt-4">
                <Badge variant="outline">
                  {trainingType}
                </Badge>
                <Badge variant="outline">
                  {new Date(startTime).toLocaleDateString()} - {new Date(endTime).toLocaleDateString()}
                </Badge>
              </div>
            </TitleCard>
            <div className="mt-6">
              {children}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-225 items-center">
            <TrainingSubmissions
              problems={problems}
              statusMap={statusMap}
              selectedProblemId={selectedProblemId}
            />
          </div>
        )}
      </div>

      <div className="w-full lg:w-auto">
        <TrainingRightSidebar
          userIden={userIden}
          trainingIden={trainingIden}
          trainingNodeId={trainingNodeId}
          initialPinned={initialPinned}
          hasEditPermission={hasEditPermission}
          completedCount={completedCount}
          totalCount={totalCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          problems={problems}
          statusMap={statusMap}
          selectedProblemId={selectedProblemId}
          onProblemSelect={setSelectedProblemId}
        />
      </div>
    </div>
  )
}
