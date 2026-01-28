"use client"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { SimplyUser } from "@rmjac/api-declare"
import { UserAvatar } from "./user-avatar"

interface UserCardProps {
  user: SimplyUser
}

export function UserCard({ user }: UserCardProps) {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardHeader className="flex flex-row items-center gap-4 py-4">
        <UserAvatar user={user} className="h-12 w-12" />
        <div className="flex flex-col">
          <CardTitle className="text-base">{user.name}</CardTitle>
          <div className="text-sm text-muted-foreground">@{user.iden}</div>
        </div>
      </CardHeader>
    </Card>
  )
}
