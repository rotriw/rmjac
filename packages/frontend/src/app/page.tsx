import { AppSidebar } from "@/components/app-sidebar";
import { StandardCard, TitleCard } from "@/components/card/card";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset >
        <div className="container mx-auto py-6 px-4 md:px-6">
          <TitleCard title="Hello" description="Rmjac version 1.0" />
          <StandardCard title="Pin">
            <StandardCard title="TODO">
            <span className="text-sm"><span className="font-extrabold text-gray-700">LG#P1001</span> 洛谷</span>
            </StandardCard>
          </StandardCard>
          <StandardCard title="Action">
            <StandardCard title="快速保存代码">
              <Input type="text" placeholder="题目ID"></Input>
            </StandardCard>
          </StandardCard>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
