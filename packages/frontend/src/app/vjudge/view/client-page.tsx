"use client"

import { useState } from "react"
import { StandardCard } from "@/components/card/card"
import { ViewVjudgeMessage } from "./viewmessage"
import { AddTaskCard } from "./add-task"
import { VjudgeWelcome } from "./welcome"

export function VjudgePageContent() {
  const [hasStarted, setHasStarted] = useState(false)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-3">
        {hasStarted ? <ViewVjudgeMessage /> : <AddTaskCard onSubmitSuccess={() => setHasStarted(true)} />}
      </div>
    </div>
  )
}

