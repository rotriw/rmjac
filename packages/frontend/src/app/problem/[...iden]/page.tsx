"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ShowProblemPage } from "@/api-components/problem/show-problem";
import { ActionMode } from "./action";
import { postView as postProblem } from "@/api/server/api_problem_view";
import { ProblemStatementViewer } from "@/components/problem/problem-statement-viewer";

export default async function ProblemPage({ params }: { params: Promise<{ iden: string[] }> }) {
  const path = await params;
  const problemIden = path.iden.join("/");
  const problem = await postProblem({
    iden: problemIden,
  })
  return (
    <>
        <AppSidebar path={`problem/${problemIden}`} />
        <div className="p-5 bg-white w-full">
          <TitleCard title="题目" description="Problem" />
          <ActionMode iden={path.iden.join("/")} sign={problem.problem.sign ?? undefined} />
          <ShowProblemPage iden={problemIden} problem={problem.problem} />
          <ProblemStatementViewer
            problemIden={problem.problem.sign}
            sign={problem.problem.sign ?? undefined}
          />
        </div>
    </>
  );
}
