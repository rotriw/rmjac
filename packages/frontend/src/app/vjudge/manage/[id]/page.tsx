import { TitleCard, StandardCard } from "@/components/card/card";
import { getVJudgeAccountDetail } from "@/lib/api";
import { notFound } from "next/navigation";
import { ManageActions } from "@/components/vjudge/manage-actions";

export default async function ManageVjudgeAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let account;
  try {
      account = await getVJudgeAccountDetail(parseInt(id));
  } catch (_e) {
    console.error(_e);
      notFound();
  }

  if (!account) {
    notFound();
  }

  const handle = account.public.iden;

  return (
    <div className="py-6 px-4 md:px-6 animate-in fade-in duration-300">
        <div className="mb-6">
            <TitleCard 
                title={`管理 ${account.public.platform} 账号`} 
                description={`管理 ${handle} 的设置与权限`} 
            />
        </div>
        <div className="grid gap-6">
            <StandardCard title="账号详情">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs">
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">平台</span>
                        <span className="font-bold">{account.public.platform}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">Handle</span>
                        <span className="font-bold">{handle}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">验证状态</span>
                        <span className={account.public.verified ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {account.public.verified ? "已验证" : "未验证"}
                        </span>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <span className="text-muted-foreground">模式</span>
                        <span className="font-bold">
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
