import { TitleCard, StandardCard } from "@/components/card/card";
import { getVJudgeAccountDetail } from "@/lib/api";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ManageActions } from "@/components/vjudge/manage-actions";

export default async function ManageVjudgeAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let account;
  try {
      account = await getVJudgeAccountDetail(parseInt(id));
  } catch (e) {
      notFound();
  }

  if (!account) {
    notFound();
  }

  let handle = "Unknown"
  if (account.private?.auth?.Password) {
      try {
          const authData = JSON.parse(account.private.auth.Password);
          handle = authData.handle || "Unknown";
      } catch {}
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
            <Link href="/vjudge/account" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回账号列表
            </Link>
            <TitleCard 
                title={`管理 ${account.public.platform} 账号`} 
                description={`管理 ${handle} 的设置与权限`} 
            />
        </div>
        
        <div className="grid gap-6">
            <StandardCard title="账号详情">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">平台</span>
                        <span className="font-medium">{account.public.platform}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">Handle</span>
                        <span className="font-medium">{handle}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">验证状态</span>
                        <span className={account.public.verified ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {account.public.verified ? "已验证" : "未验证"}
                        </span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">模式</span>
                        <span className="font-medium">
                            {account.public.remote_mode}
                        </span>
                    </div>
                </div>
            </StandardCard>

            <StandardCard title="操作">
                <ManageActions nodeId={account.node_id} />
            </StandardCard>
        </div>
    </div>
  )
}
