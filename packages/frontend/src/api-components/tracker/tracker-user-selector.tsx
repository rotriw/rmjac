"use client"

import { useState } from "react"
import { TrackerUser, userKey, userDisplayName } from "@/lib/tracker-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X, User, Globe } from "lucide-react"

interface TrackerUserSelectorProps {
  users: TrackerUser[]
  onChange: (users: TrackerUser[]) => void
}

export function TrackerUserSelector({ users, onChange }: TrackerUserSelectorProps) {
  const [inputMode, setInputMode] = useState<"local" | "remote">("remote")
  const [handle, setHandle] = useState("")
  const [platform, setPlatform] = useState<"codeforces" | "atcoder">("codeforces")
  const [localUserId, setLocalUserId] = useState("")
  const [localUserName, setLocalUserName] = useState("")

  const addRemoteUser = () => {
    const trimmed = handle.trim()
    if (!trimmed) return
    const newUser: TrackerUser = { type: "remote", platform, handle: trimmed }
    // 去重
    if (users.some(u => userKey(u) === userKey(newUser))) return
    onChange([...users, newUser])
    setHandle("")
  }

  const addLocalUser = () => {
    const id = parseInt(localUserId)
    if (isNaN(id)) return
    const name = localUserName.trim() || `User #${id}`
    const newUser: TrackerUser = { type: "local", userId: id, name }
    if (users.some(u => userKey(u) === userKey(newUser))) return
    onChange([...users, newUser])
    setLocalUserId("")
    setLocalUserName("")
  }

  const removeUser = (key: string) => {
    onChange(users.filter(u => userKey(u) !== key))
  }

  return (
    <Card className="shadow-none rounded-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          用户选择
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 已选用户列表 */}
        {users.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {users.map((u) => {
              const key = userKey(u)
              return (
                <Badge key={key} variant="secondary" className="gap-1 pr-1">
                  {u.type === "remote" && <Globe className="h-3 w-3" />}
                  {u.type === "local" && <User className="h-3 w-3" />}
                  {userDisplayName(u)}
                  <button onClick={() => removeUser(key)} className="ml-1 hover:bg-muted rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}

        {/* 添加用户表单 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={inputMode} onValueChange={(v) => setInputMode(v as "local" | "remote")}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">远程</SelectItem>
              <SelectItem value="local">本地</SelectItem>
            </SelectContent>
          </Select>

          {inputMode === "remote" ? (
            <>
              <Select value={platform} onValueChange={(v) => setPlatform(v as "codeforces" | "atcoder")}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="codeforces">Codeforces</SelectItem>
                  <SelectItem value="atcoder">AtCoder</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Handle（如 tourist）"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRemoteUser()}
                className="w-[200px]"
              />
              <Button size="sm" onClick={addRemoteUser} disabled={!handle.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                添加
              </Button>
            </>
          ) : (
            <>
              <Input
                placeholder="用户 ID"
                type="number"
                value={localUserId}
                onChange={(e) => setLocalUserId(e.target.value)}
                className="w-[100px]"
              />
              <Input
                placeholder="用户名（可选）"
                value={localUserName}
                onChange={(e) => setLocalUserName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLocalUser()}
                className="w-[150px]"
              />
              <Button size="sm" onClick={addLocalUser} disabled={!localUserId}>
                <Plus className="h-4 w-4 mr-1" />
                添加
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}