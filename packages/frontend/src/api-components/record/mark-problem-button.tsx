"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MarkProblemDialog } from "@/api-components/record/mark-problem-dialog"
import { Bookmark } from "lucide-react"
import { useRouter } from "next/navigation"

interface MarkProblemButtonProps {
  problemIden: string
}

export function MarkProblemButton({ problemIden }: MarkProblemButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        title="标记题目"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <Bookmark className="size-3.5" />
      </Button>
      <MarkProblemDialog
        problemIden={problemIden}
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
