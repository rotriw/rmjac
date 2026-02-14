import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { VJudgeRightSidebar } from "./rightbar"
import type { ReactNode } from "react"

interface VJudgeLayoutProps {
  children: ReactNode
}

export default function VJudgeLayout({ children }: VJudgeLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="container mx-auto py-6 px-4 md:px-6">
          {children}
        </div>
      </SidebarInset>
      <VJudgeRightSidebar />
    </SidebarProvider>
  )
}
