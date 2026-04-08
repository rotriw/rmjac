"use server";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { CreateAction } from "./action";

export default async function ProblemPage() {
  return (
    <>
        <AppSidebar path={`problem/create`} />
        <div className="p-5 bg-white w-full">
          {/* <TitleCard title="题目创建" description="Problem Create" /> */}
          <CreateAction params={Promise.resolve({ iden: "problem/create" })}></CreateAction>
        </div>
    </>
  );
}
