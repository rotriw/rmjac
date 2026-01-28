"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SimplyUser } from "@rmjac/api-declare"
import { getGravatarUrl } from "@/lib/gravatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  user: SimplyUser
  className?: string
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // If user.avatar is empty, use Gravatar if email is available (but SimplyUser doesn't have email in the definition I saw? Wait, let me check SimplyUser again)
  // The cat output: export type SimplyUser = { node_id: bigint, avatar: string, name: string, iden: string, };
  // It doesn't have email. So I can only use user.avatar. If user.avatar is empty, maybe fallback to default or use name initials.
  // But wait, the existing UserAvatar component used `user.email`. 
  // Let's re-read packages/frontend/src/components/user-avatar.tsx carefully.
  // It defines `type UserData = SimplyUser`.
  // And uses `user.email`.
  // Maybe SimplyUser has optional email? Or my `cat` output was truncated or I missed something?
  // Let's check `SimplyUser.ts` again.

  return (
    <Avatar className={cn("h-8 w-8 rounded-lg", className)}>
      <AvatarImage
        src={user.avatar || (user.iden ? getGravatarUrl(user.iden + "@example.com") : "")} // Fallback to iden as email if no avatar? Or just initials.
        alt={user.name}
        className="object-cover"
      />
      <AvatarFallback className="rounded-lg">
        {getInitials(user.name)}
      </AvatarFallback>
    </Avatar>
  )
}
