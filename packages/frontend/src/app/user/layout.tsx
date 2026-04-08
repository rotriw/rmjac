import { SidebarProvider } from "@/components/ui/sidebar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
