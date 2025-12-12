import { TitleCard, StandardCard } from "@/components/card/card";
import { getVJudgeAccounts } from "@/lib/api";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ManageVjudgeAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accounts = await getVJudgeAccounts();
  const account = accounts.find(a => a.id === id);

  if (!account) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
            <Link href="/vjudge/account" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回账号列表
            </Link>
            <TitleCard 
                title={`管理 ${account.platform} 账号`} 
                description={`管理 ${account.handle} 的设置与权限`} 
            />
        </div>
        
        <div className="grid gap-6">
            <StandardCard title="账号详情">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">平台</span>
                        <span className="font-medium">{account.platform}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">Handle</span>
                        <span className="font-medium">{account.handle}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">验证状态</span>
                        <span className={account.verified_status ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {account.verified_status ? "已验证" : "未验证"}
                        </span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">权限范围</span>
                        <span className="font-medium">
                            {
                                {
                                    "public": "公共账号",
                                    "sync_only": "仅同步",
                                    "submit": "允许提交"
                                }[account.permission || "public"]
                            }
                        </span>
                    </div>
                </div>
            </StandardCard>

            <StandardCard title="操作">
                <div className="flex flex-wrap gap-4">
                    <Button variant="outline">同步提交记录</Button>
                    <Button variant="destructive">解除绑定</Button>
                </div>
            </StandardCard>
        </div>
    </div>
  )
}
