import { TitleCard } from "@/components/card/card";
import { VjudgePageContent } from "./client-page";


export default async function ViewVjudgePage() {
  return (<>
    <div className="container mx-auto py-6 px-4 md:px-6">
        <TitleCard title="同步远程数据" description="Sync Submissions" />
        <VjudgePageContent />
    </div>
  </>
  )
}