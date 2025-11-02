"use client"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StandardCard, TitleCard } from "@/components/card/card"

export default function ProblemPage() {
  const params = useParams()
  const problemId = params.id as string
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <TitleCard title="A+B Problem" description={problemId} />
      <StandardCard title="题面">
        None.
      </StandardCard>
      <StandardCard title="历史代码">
        None.
      </StandardCard>
      <Button size="sm">保存代码</Button>
    </div>
  )
}
