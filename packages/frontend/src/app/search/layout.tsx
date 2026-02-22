import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`} style={{backgroundColor: "#f7f7f7"}}
      >
        <AuthProvider>
        <SidebarProvider>
            {children}
        </SidebarProvider>
        <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
