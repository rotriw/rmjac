import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Title } from "@radix-ui/react-dialog";

import React from "react";

export default function RootLayout({
  children,
  
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
            {<SidebarProvider>
      <AppSidebar />
      <SidebarInset className="container mx-auto py-6 px-4 md:px-6">
        <TitleCard title="用户中心" description="查看和编辑个人信息" className="w-full" />
        {children}
      </SidebarInset>
    </SidebarProvider>}
      </body>
    </html>
  );
}
