import { Suspense } from "react";
import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import RecordSearchClient from "./record-search-client";
import { Loader2 } from "lucide-react";

export default function RecordPage() {
  return (
    <>
      <AppSidebar path="record" />
      <div className="p-5 bg-white w-full">
        <TitleCard title="记录" description="Record" />
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>}>
          <RecordSearchClient />
        </Suspense>
      </div>
    </>
  );
}
