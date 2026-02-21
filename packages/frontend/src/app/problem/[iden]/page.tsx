"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ShowProblemPage } from "./render";
import { platform } from "os";
import { ActionMode } from "./action";
export async function NoLogin() {
  return (
    <>
      <TitleCard title="Hello!" description="Rmjac" />
    </>
  );
}

export default async function ProblemPage({ params }: { params: Promise<{ iden: string }> }) {
  const path = await params;
  const problem = {
    id: 1,
    name: "Two Sum",
    description: {
      content: "123",
      description_type: "Markdown",
    },
    difficulty: {
      "NumberStyle": 123,
    },
    platform: "codeforces",
    limit: {
      time_limit: 1000,
      memory_limit: 256,
    },
    iden: path.iden,
  };
  return (
    <>
        <AppSidebar path={`problem/${path.iden}`} />
        <div className="p-5 bg-white w-full">
          <TitleCard title="题目" description="Problem" />
          <ActionMode iden={path.iden} />
          <ShowProblemPage problem={problem} />
        </div>
    </>
  );
}
