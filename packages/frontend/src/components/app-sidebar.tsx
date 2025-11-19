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
import { getSidebar } from "@/lib/api"
import { useEffect } from "react"


let side_bar = {};
let sb = false;

export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  if (!sb) {
    side_bar = await(await getSidebar());
    sb = true;
  }
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
