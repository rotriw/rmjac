"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ShowProblemPage } from "@/api-components/problem/show-problem";
import { platform } from "os";
import { ActionMode } from "./action";
import { postView as postProblem } from "@/api/server/api_problem_view";
export async function NoLogin() {
  return (
    <>
      <TitleCard title="Hello!" description="Rmjac" />
    </>
  );
}

export default async function ProblemPage({ params }: { params: Promise<{ iden: string[] }> }) {
  const path = await params;
  const problem = await postProblem( {
    iden: path.iden.join("."),
  })
  return (
    <>
        <AppSidebar path={`problem/${path.iden.join(".")}`} />
        <div className="p-5 bg-white w-full">
          <TitleCard title="题目" description="Problem" />
          <ActionMode iden={path.iden.join("/")} />
          <ShowProblemPage iden={path.iden.join(".")} problem={problem.problem} />
        </div>
    </>
  );
}
