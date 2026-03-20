"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { TitleCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, ArrowRight } from "lucide-react"

export default function TrackerIndexPage() {
  const [idens, setIdens] = useState("")
  const router = useRouter()

  const handleGo = () => {
    const trimmed = idens.trim()
    if (!trimmed) return
    router.push(`/tracker/${trimmed}`)
  }

  return (
    <>
      <div className="p-5 bg-white w-full min-h-screen">
        <TitleCard title="Tracker" description="追踪多个事件的题目通过状态" />

        <Card className="mt-4 shadow-none rounded-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              开始追踪
            </CardTitle>
            <CardDescription>
              输入事件标识符（iden），用逗号分隔多个事件。例如：<code className="bg-muted px-1 rounded text-xs">codeforces,CF1923</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                placeholder="例如：codeforces,CF1923"
                value={idens}
                onChange={(e) => setIdens(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGo()}
                className="flex-1"
              />
              <Button onClick={handleGo} disabled={!idens.trim()}>
                <ArrowRight className="h-4 w-4 mr-1" />
                查看
              </Button>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">快捷入口</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Codeforces", path: "codeforces" },
                  { label: "AtCoder", path: "atcoder" },
                ].map((item) => (
                  <Button
                    key={item.path}
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/tracker/${item.path}`)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
