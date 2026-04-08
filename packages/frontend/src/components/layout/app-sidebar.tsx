import * as React from "react"
import { NavMain } from "@/components/layout/nav-main"
import { UserAvatar } from "@/components/layout/current-user-avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
// import { getSidebar } from "@/api/server/api_user_info"
import { useSearchParams } from "next/navigation"
import { postSidebar } from "@/api/server/api_view_default"
import { headers } from "next/headers"


export async function AppSidebar({ path,...props }: React.ComponentProps<typeof Sidebar>  & {path: string}) {
  //console.log(items);
  const searchParams = await headers();
  console.log(searchParams.get("x-current-path"));
  const sidebarData = await postSidebar({ path })
  console.log(sidebarData);
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <NavMain items={sidebarData.data} />
      </SidebarHeader>
      <SidebarContent />
      <UserAvatar />
      <SidebarRail />
    </Sidebar>
  )
}
