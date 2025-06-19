"use client"

import { useState, useEffect } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CardTitle } from "./ui/card"

// 生成模拟数据
const generateContributionData = () => {
  const data = []
  const now = new Date()
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(now.getFullYear() - 1)

  // 从一年前开始到现在的每一天
  for (let d = new Date(oneYearAgo); d <= now; d.setDate(d.getDate() + 1)) {
    // 随机生成贡献数量 (0-10)
    const count = Math.floor(Math.random() * 11)
    data.push({
      date: new Date(d),
      count,
    })
  }

  return data
}

// 获取贡献等级对应的颜色
const getContributionColor = (count: number) => {
  if (count === 0) return "bg-gray-100 dark:bg-gray-800"
  if (count <= 2) return "bg-emerald-100 dark:bg-emerald-900"
  if (count <= 5) return "bg-emerald-300 dark:bg-emerald-700"
  if (count <= 8) return "bg-emerald-500 dark:bg-emerald-500"
  return "bg-emerald-700 dark:bg-emerald-300"
}

// 格式化日期
const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0]
}

export default function ContributionGraph() {
  const [contributionData, setContributionData] = useState<Array<{ date: Date; count: number }>>([])
  const [weeks, setWeeks] = useState<Array<Array<{ date: Date; count: number }>>>([])

  useEffect(() => {
    // 生成模拟数据
    const data = generateContributionData()
    setContributionData(data)

    // 将数据按周分组
    const weekData: Array<Array<{ date: Date; count: number }>> = []
    let currentWeek: Array<{ date: Date; count: number }> = []

    data.forEach((day, index) => {
      const dayOfWeek = day.date.getDay()

      // 如果是周日且不是第一个元素，开始新的一周
      if (dayOfWeek === 0 && index > 0) {
        weekData.push([...currentWeek])
        currentWeek = []
      }

      currentWeek.push(day)

      // 如果是最后一个元素，添加最后一周
      if (index === data.length - 1) {
        weekData.push([...currentWeek])
      }
    })

    setWeeks(weekData)
  }, [])

  // 获取月份标签
  const getMonthLabels = () => {
    if (contributionData.length === 0) return []

    const months = []
    let currentMonth = -1

    contributionData.forEach((day) => {
      const month = day.date.getMonth()
      if (month !== currentMonth) {
        months.push({
          month,
          date: new Date(day.date),
        })
        currentMonth = month
      }
    })

    return months
  }

  // 获取总贡献数
  const getTotalContributions = () => {
    return contributionData.reduce((sum, day) => sum + day.count, 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm">
          <CardTitle>题目通过数</CardTitle>
          <span className=" text-muted-foreground"></span>{contributionData.length > 0 && <span>共 {getTotalContributions()} 次通过（过去一年 {getTotalContributions()} 次）</span>}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">贡献少</span>
          <div className="flex space-x-1">
            <div className={`w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800`}></div>
            <div className={`w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900`}></div>
            <div className={`w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-700`}></div>
            <div className={`w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500`}></div>
            <div className={`w-3 h-3 rounded-sm bg-emerald-700 dark:bg-emerald-300`}></div>
          </div>
          <span className="text-xs text-muted-foreground">贡献多</span>
        </div>
      </div>

      <div className="relative">

        <div className="flex">

          <div className="flex space-x-1 overflow-x-auto">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-rows-7 gap-1">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const day = week.find((d) => d.date.getDay() === dayIndex)

                  return (
                    <TooltipProvider key={dayIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`w-3 h-3 rounded-xs ${day ? getContributionColor(day.count) : "bg-gray-100 dark:bg-gray-800"}`}
                          ></div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {day ? `${day.count} 次贡献 ${formatDate(day.date)}` : "无贡献"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
