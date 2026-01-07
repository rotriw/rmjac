import * as React from "react"
import {
  BookMinusIcon,
  ClipboardCheckIcon,
  Home,
  LibraryIcon,
  User2,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { UserAvatar } from "@/components/user-avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getSidebar } from "@/api/server/user"
import { useEffect } from "react"


let side_bar = {};
let sb = false;

export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  side_bar = await(await getSidebar());
  console.log(side_bar);
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <NavMain items={side_bar.sidebar} />
      </SidebarHeader>
      <SidebarContent />
      <UserAvatar />
      <SidebarRail />
    </Sidebar>
  )
}
