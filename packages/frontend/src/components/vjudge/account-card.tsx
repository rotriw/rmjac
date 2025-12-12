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
  return (
    <Card className="w-full shadow-none border rounded-sm overflow-hidden">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">{account.platform}</span>
             {account.verified_status ? (
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
            <div className="text-lg font-bold truncate" title={account.handle}>{account.handle}</div>
            <div className="text-xs text-muted-foreground mt-1">
            权限: {
                {
                    "public": "公共账号",
                    "sync_only": "仅同步",
                    "submit": "允许提交"
                }[account.permission || "public"]
            }
            </div>
        </div>

        <div className="pt-2 mt-auto">
            <Button asChild variant="outline" size="sm" className="w-full h-8 text-xs">
            <Link href={`/vjudge/manage/${account.id}`}>
                <Settings className="mr-2 h-3 w-3" />
                管理账号
            </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
