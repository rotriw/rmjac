"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
export async function NoLogin() {
  return (
    <>
      <TitleCard title="Hello!" description="Rmjac" />
    </>
  );
}


export default async function ProblemPage() {
  return (
    <>
        <AppSidebar path="problem" />
        <div className="p-5 bg-white w-full">
          <TitleCard title="题目" description="Problem" />
        </div>
    </>
  );
}
