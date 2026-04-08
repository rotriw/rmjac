"use client"

import { TrackerEventRow, TrackerUser, StatusMatrix, userKey, userDisplayName } from "@/lib/tracker-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, CheckCircle2, XCircle, TrendingUp } from "lucide-react"

interface TrackerStatsProps {
  rows: TrackerEventRow[]
  users: TrackerUser[]
  statusMatrix: StatusMatrix
}

export function TrackerStats({ rows, users, statusMatrix }: TrackerStatsProps) {
  const totalProblems = rows.reduce((acc, row) => acc + row.problems.length, 0)

  if (users.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<BarChart3 className="h-5 w-5 text-blue-500" />} title="事件数" value={rows.length} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-500" />} title="总题目数" value={totalProblems} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-purple-500" />} title="用户数" value={0} subtitle="添加用户以查看统计" />
      </div>
    )
  }

  // 按用户统计
  const userStats = users.map(u => {
    const uKey = userKey(u)
    const userMap = statusMatrix.get(uKey)
    let passed = 0
    let attempted = 0

    for (const row of rows) {
      for (const [, iden] of row.problems) {
        const fullIden = `${row.iden}/${iden}`.toLowerCase()
        const status = userMap?.get(fullIden)
        if (status) {
          attempted++
          if (status.passed) passed++
        }
      }
    }

    return {
      user: u,
      passed,
      attempted,
      total: totalProblems,
      rate: totalProblems > 0 ? ((passed / totalProblems) * 100).toFixed(1) : "0",
    }
  })

  return (
    <div className="space-y-4">
      {/* 总览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<BarChart3 className="h-5 w-5 text-blue-500" />} title="事件数" value={rows.length} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-500" />} title="总题目数" value={totalProblems} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-purple-500" />} title="追踪用户数" value={users.length} />
      </div>

      {/* 按用户对比 */}
      <Card className="shadow-none rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">用户对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userStats.map(({ user, passed, attempted, total, rate }) => (
              <div key={userKey(user)} className="flex items-center gap-3">
                <span className="text-sm font-medium w-[160px] truncate">{userDisplayName(user)}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${total > 0 ? (passed / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-[120px] text-right">
                  {passed}/{total} ({rate}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 按事件统计 */}
      <Card className="shadow-none rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">按事件统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">事件</th>
                  <th className="text-right py-2 px-2">题数</th>
                  {users.map(u => (
                    <th key={userKey(u)} className="text-right py-2 px-2">{userDisplayName(u)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.iden} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{row.event.name}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{row.problems.length}</td>
                    {users.map(u => {
                      const uKey = userKey(u)
                      const userMap = statusMatrix.get(uKey)
                      let passed = 0
                      for (const [, iden] of row.problems) {
                        const fullIden = `${row.iden}/${iden}`.toLowerCase()
                        if (userMap?.get(fullIden)?.passed) passed++
                      }
                      const allDone = passed === row.problems.length && row.problems.length > 0
                      return (
                        <td
                          key={uKey}
                          className={`text-right py-2 px-2 ${allDone ? "text-green-600 font-medium" : "text-muted-foreground"}`}
                        >
                          {passed}/{row.problems.length}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, title, value, subtitle }: { icon: React.ReactNode; title: string; value: number; subtitle?: string }) {
  return (
    <Card className="shadow-none rounded-sm">
      <CardContent className="flex items-center gap-3 py-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
