"use client"

import * as React from "react"
import {
  BookMinusIcon,
  ClipboardCheckIcon,
  Home,
  LibraryIcon,
  User2,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "主页",
      url: "/",
      icon: Home,
    },
    {
      title: "题单",
      url: "/training",
      icon: ClipboardCheckIcon,
    },
    {
      title: "用户详情",
      url: "[current]",
      shows: "/user/.*",
      reg: "/user/.*",
      icon: User2,
      badge: "102",
    },
    {
      title: "题目详情",
      url: "[current]",
      shows: "/problem/.*",
      reg: "/problem/.*",
      icon: BookMinusIcon,
      badge: "102",
    },
    {
      title: "训练详情",
      url: "[current]",
      shows: "/training/.*",
      reg: "/training/.*",
      icon: LibraryIcon,
      badge: "102",
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarRail />
    </Sidebar>
  )
}
