"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VJudgeAccount } from "@/lib/api"
import Link from "next/link"
import { CheckCircle2, XCircle, Settings } from "lucide-react"

interface VJudgeAccountCardProps {
  account: VJudgeAccount
}

export function VJudgeAccountCard({ account }: VJudgeAccountCardProps) {
  let handle = account.public.iden;
  
  // Try to extract handle from auth
  if (account.private.auth?.Password) {
      try {
          const authData = JSON.parse(account.private.auth.Password);
          if (authData.handle) {
              handle = authData.handle;
          }
      } catch (e) {
          // If not JSON, maybe just the password? Or we treat it as unknown.
          // Or maybe we can display the iden? iden is "vjudge_uid_Platform".
      }
  }

  return (
    <Card className="w-full shadow-none border rounded-sm overflow-hidden">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">{account.public.platform}</span>
             {account.public.verified ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    已验证
                </Badge>
            ) : (
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                    <XCircle className="mr-1 h-3 w-3" />
                    未验证
                </Badge>
            )}
        </div>
        
        <div>
            <div className="text-lg font-bold truncate" title={handle}>{handle}</div>
            <div className="text-xs text-muted-foreground mt-1">
            模式: {
                // Assuming remote_mode string is returned?
                // The Node definition uses enum but serialized as string/int?
                // Let's assume it's displayed as is or mapped.
                // The API interface defines it as string.
                account.public.remote_mode
            }
            </div>
        </div>

        <div className="pt-2 mt-auto">
            <Button asChild variant="outline" size="sm" className="w-full h-8 text-xs">
            <Link href={`/vjudge/manage/${account.node_id}`}>
                <Settings className="mr-2 h-3 w-3" />
                管理账号
            </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
