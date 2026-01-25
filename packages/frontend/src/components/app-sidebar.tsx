import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { UserAvatar } from "@/components/user-avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getSidebar } from "@/api/server/api_user_info"


export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const sidebarData = await getSidebar({ _path: null })
  console.log(sidebarData);
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <NavMain items={sidebarData.sidebar} />
      </SidebarHeader>
      <SidebarContent />
      <UserAvatar />
      <SidebarRail />
    </Sidebar>
  )
}
