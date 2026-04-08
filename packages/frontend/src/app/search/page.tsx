"use server";

import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ShowSearchPage } from "./search";

export default async function SearchPage({searchParams}: {searchParams: Promise<{ iden: string, typed: string }>}) {
  const sp = await searchParams;
  const value = sp.typed;
  return (
    <>
        <AppSidebar path="search" />
        <div className="p-5 bg-white w-full">
          <TitleCard title="搜索" description="Search" />
          <ShowSearchPage iden={value} />
        </div>
    </>
  );
}
