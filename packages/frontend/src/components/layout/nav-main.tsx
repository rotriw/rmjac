"use client"

import { type LucideIcon } from "lucide-react"

import * as Icon from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export function ShowIcon({
  icon,
}: {
  icon: string
}) {
  const IconC = Icon[icon];
  return (<IconC />);
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: string
    reg?: string
    show?: string
  }[]
}) {
  console.log(items);
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
      {items.map((item) => ( new RegExp(item.show || "").test(pathname) || item.show === undefined ?
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={
            isActive(item.reg || "", pathname, item.url)
          }>
            <a href={item.url}>
              <ShowIcon icon={item.icon}></ShowIcon>
              <span>{item.title}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem> : <></>
      ))}
    </SidebarMenu>
  )
}
