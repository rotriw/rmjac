"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import { LogOut, User } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getUserInfo } from "@/api/server/api_user_info"
import Link from "next/link"
import { getGravatarUrl } from "@/lib/gravatar"
import { SimplyUser } from "@rmjac/api-declare"

type UserData = SimplyUser

export function UserAvatar() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const data = await getUserInfo()
        if (data.is_login && data.user) {
          setUser(data.user)
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserInfo()
  }, [])

  if (isLoading) {
    return null
  }

  if (!user) {
    return (
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/login">
              <SidebarMenuButton size="lg" className="w-full">
                <User className="mr-2 h-4 w-4" />
                <span>登录/注册</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    try {
      // TODO: 调用后端登出API
      // await fetch(`${API_BASE_URL}/api/user/logout/${user.iden}`, { method: 'POST', credentials: 'include' })
      setUser(null)
      window.location.href = "/login"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={user.avatar || (user.email ? getGravatarUrl(user.email) : "/default-avatar.png")}
                    alt={user.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    @{user.iden}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuItem asChild>
                <Link href={`/user/${user.iden}`} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  个人主页
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}