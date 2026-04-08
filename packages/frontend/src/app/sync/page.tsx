"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ManageAction } from "./render";

export default async function ProblemPage() {
  return (
    <>
        <AppSidebar path="event" />
        <div className="p-5 bg-white w-full">
          <TitleCard title="同步" description="Sync" />
          <ManageAction />
        </div>
    </>
  );
}
