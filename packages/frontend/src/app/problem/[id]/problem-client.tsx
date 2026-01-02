"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { StandardCard } from "@/components/card/card"

interface Record {
  node_id: number
  public: {
    record_status: number
    time_elapsed: number
    memory_used: number
    language: string
    creation_time: string
  }
}

interface ProblemClientProps {
  problemId: string
  timeLimit?: number
  memoryLimit?: number
  userRecords?: Record[]
  isLoggedIn?: boolean
}

export default function ProblemClient({ 
  problemId, 
  timeLimit, 
  memoryLimit, 
  userRecords = [],
  isLoggedIn = false
}: ProblemClientProps) {
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("cpp")

  const handleSaveCode = () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再保存代码")
      return
    }
    console.log("保存代码:", { problemId, code, language })
  }

  const getStatusText = (status: number) => {
    const statusMap: { [key: number]: string } = {
      0: "Pending",
      1: "Running",
      2: "Accepted",
      3: "Wrong Answer",
      4: "Time Limit Exceeded",
      5: "Memory Limit Exceeded",
      6: "Runtime Error",
      7: "Compile Error",
    }
    return statusMap[status] || "Unknown"
  }

  return (
    <Tabs defaultValue="submit" className="mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="submit">代码编辑</TabsTrigger>
        <TabsTrigger value="history">提交记录</TabsTrigger>
      </TabsList>
      
      <TabsContent value="submit">
        <StandardCard title="代码编辑器">
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-1 py-1 border border-gray-300 rounded-md bg-white w-auto"
              >
                <option value="cpp">C++</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
            
            <Textarea
              placeholder="在这里编写你的代码..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-96 font-mono text-sm"
            />
            
            <div className="flex justify-between items-center">
              <Button
                onClick={handleSaveCode}
                disabled={!code.trim()}
                variant={isLoggedIn ? "default" : "outline"}
              >
                {isLoggedIn ? "保存代码" : "登录后保存"}
              </Button>
            </div>
          </div>
        </StandardCard>
      </TabsContent>
      
      <TabsContent value="history">
        <StandardCard title="历史提交">
          {userRecords && userRecords.length > 0 ? (
            <div className="space-y-2">
              {userRecords.map((record) => (
                <div key={record.node_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={record.public.record_status === 2 ? "default" : "destructive"}
                    >
                      {getStatusText(record.public.record_status)}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {record.public.language} • {record.public.time_elapsed}ms • {record.public.memory_used}KB
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(record.public.creation_time).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              暂无提交记录
            </div>
          )}
        </StandardCard>
      </TabsContent>
    </Tabs>
  )
}
