"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ShowProblemPage } from "./render";
import { platform } from "os";
import { ActionMode } from "./action";
import { CreateAction } from "./action";
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
        <AppSidebar path={`problem/create`} />
        <div className="p-5 bg-white w-full">
          {/* <TitleCard title="题目创建" description="Problem Create" /> */}
          <CreateAction></CreateAction>
        </div>
    </>
  );
}
