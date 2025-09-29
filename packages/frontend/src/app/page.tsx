import { AppSidebar } from "@/components/app-sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Terminal, Verified } from "lucide-react";

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset >
        <div className="container mx-auto py-6 px-4 md:px-6">
          <CardTitle>Hello</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mb-2">
              Rmjac version 1.0
          </CardDescription>
          <Alert variant="successful" className="mb-2">
            <Verified />
            <AlertTitle>可信用户 · Developer</AlertTitle>
            <AlertDescription className="mt-2">
            <span><span className="font-bold">可信用户</span> Verfied by QQ Group: 46882734</span>
            <span><span className="font-bold">Developer</span> <span className="underline">Rmjac</span> dev.</span>
            </AlertDescription>
          </Alert>
          <Card className="mb-2 shadow-none rounded-sm p-0">
            <CardContent className="p-2">
              <CardTitle className="text-sm mb-2">Pin</CardTitle>
              <Card className="mb-2 shadow-none rounded-sm p-0">
                <CardContent className="p-3">
                <CardTitle className="text-sm mb-2">TODO</CardTitle>
                  <span className="text-sm"><span className="font-extrabold text-gray-700">LG#P1001</span> 洛谷</span>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          <Card className="mb-2 shadow-none rounded-sm p-0">
            <CardContent className="p-2">
              <CardTitle className="text-sm mb-2">Action</CardTitle>
              <Card className="mb-2 shadow-none rounded-sm p-0">
                <CardContent className="p-3">
                <CardTitle className="text-sm mb-2">快速保存代码</CardTitle>
                  <Input type="text" placeholder="题目ID"></Input>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
