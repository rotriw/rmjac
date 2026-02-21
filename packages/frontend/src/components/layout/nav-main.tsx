"use client"

import { type LucideIcon } from "lucide-react"

import * as Icon from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
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
    name: string
    path: string
    icon: string
    active: boolean
  }[]
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.name}>
          <SidebarMenuButton asChild isActive={
            item.active
          }>
            <a href={`/${item.path}`}>
              <ShowIcon icon={item.icon}></ShowIcon>
              <span>{item.name}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
