import type { Metadata } from "next";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { VJudgeRightSidebar } from "./rightbar/vjudge-right-sidebar";

export const metadata: Metadata = {
  title: "Rmjac - VJudge",
  description: "VJudge Account Management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
      <VJudgeRightSidebar />
    </SidebarProvider>
  );
}