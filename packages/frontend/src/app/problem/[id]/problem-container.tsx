"use client"

import * as React from "react"
import { useState } from "react"
import { TitleCard } from "@/components/card/card"
import ProblemClient from "./problem-client"
import { ProblemRightSidebar } from "./problem-right-sidebar"
import { ProblemModel, ProblemLimitNode } from "./page"
import { RecordEdge } from "@rmjac/api-declare"

interface ProblemContainerProps {
  id: string
  model: ProblemModel
  mainLimit: ProblemLimitNode | null
  user_recent_records: RecordEdge[] | undefined
  isLoggedIn: boolean
  statement: number
  platform: string
  children?: React.ReactNode
}

export default function ProblemContainer({
  id,
  model,
  mainLimit,
  user_recent_records,
  isLoggedIn,
  statement,
  platform,
  children
}: ProblemContainerProps) {
  const [viewMode, setViewMode] = useState<"statement" | "submit">("statement")

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0">
      <div className="flex-1 w-full py-6 px-4 md:px-6 lg:overflow-y-auto">
        {viewMode === "statement" ? (
          <div className="animate-in fade-in duration-300">
            <TitleCard
              title={model.problem_node.public.name}
              description={`ID: ${id}`}
            />
            <div className="mt-6">
              {children}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProblemClient
              problemId={id}
              statementId={statement}
              userRecords={user_recent_records}
              isLoggedIn={isLoggedIn}
              platform={platform}
            />
          </div>
        )}
      </div>

      <div className="w-full lg:w-auto">
        <ProblemRightSidebar
          problemId={id}
          mainLimit={mainLimit ? { public: { time_limit: mainLimit.public.time_limit, memory_limit: mainLimit.public.memory_limit } } : undefined}
          tags={model.tag}
          userRecords={user_recent_records || []}
          statements={model.problem_statement_node.map(([stmt]) => stmt)}
          currentStatementId={statement}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    </div>
  )
}