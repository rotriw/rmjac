"use client"

import * as React from "react"
import {
  AudioWaveform,
  BadgeCheckIcon,
  Blocks,
  BookMinusIcon,
  Calculator,
  CalculatorIcon,
  Calendar,
  CheckIcon,
  ClipboardCheckIcon,
  Command,
  Home,
  Inbox,
  LibraryIcon,
  MessageCircleQuestion,
  Search,
  Settings2,
  Sparkles,
  TableOfContentsIcon,
  Trash2,
  User2,
  Users,
  BookOpen,
  Target,
  BarChart3,
} from "lucide-react"

import { NavFavorites } from "@/components/nav-favorites"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavWorkspaces } from "@/components/nav-workspaces"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { usePathname, useSearchParams } from "next/navigation"

// This is sample data.
const data = {
  teams: [
    {
      name: "Rmjac Global",
      logo: BadgeCheckIcon,
      plan: "Global",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
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
  ],
  navAdmin: [
    {
      title: "管理面板",
      url: "/admin/dashboard",
      icon: BarChart3,
    },
    {
      title: "用户管理",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "题目管理",
      url: "/admin/problems",
      icon: BookOpen,
    },
    {
      title: "训练管理",
      url: "/admin/trainings",
      icon: Target,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navAdmin} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
