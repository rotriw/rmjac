"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ManageAction } from "./manage";

export default async function ProblemPage() {
  return (
    <>
        <AppSidebar path="problem" />
        <div className="p-5 w-full">
          <TitleCard title="管理" description="Manage" />
          <ManageAction />
        </div>
    </>
  );
}
