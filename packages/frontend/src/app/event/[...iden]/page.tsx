"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ShowEventPage } from "./render";
import { platform } from "os";
import { ActionMode } from "./action";
import { Event } from "@rmjac/api-declare";
import { postView as postEvent } from "@/api/server/api_event_view";

export default async function ProblemPage({ params }: { params: Promise<{ iden: string[] }> }) {
  const path = await params;
  const iden = path.iden.join("/");
  const event = await postEvent( {
    iden
  });
  return (
    <>
        <AppSidebar path={`event/${path.iden}`} />
        <div className="p-5 bg-white w-full">
          <TitleCard title={event.event.name} description="Event" />
          <ActionMode iden={iden} />
          <ShowEventPage event={event.event} />
        </div>
    </>
  );
}
