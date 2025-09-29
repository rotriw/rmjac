"use client"

import { type LucideIcon } from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    reg?: string
    shows?: string
  }[]
}) {
  const pathname = usePathname();
  console.log(pathname);
  function isActive(reg: string, pathname: string, url: string) {
    console.log(reg);
    console.log(pathname);
    if (reg === "") {
      return pathname === url;
    }
    console.log(new RegExp(reg || url).test(pathname));
    return new RegExp(reg || url).test(pathname);
  }
  return (
    <SidebarMenu>
      {items.map((item) => ( new RegExp(item.shows || "").test(pathname) || item.shows === undefined ?
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={
            isActive(item.reg || "", pathname, item.url)
          }>
            <a href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem> : <></>
      ))}
    </SidebarMenu>
  )
}
