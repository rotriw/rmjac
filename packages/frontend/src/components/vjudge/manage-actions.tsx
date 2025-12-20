"use client"

import { Button } from "@/components/ui/button"
import { deleteVJudgeAccount, assignVJudgeTask } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface ManageActionsProps {
    nodeId: number
}

export function ManageActions({ nodeId }: ManageActionsProps) {
    const router = useRouter()
    const [deleting, setDeleting] = useState(false)
    const [syncing, setSyncing] = useState(false)

    const handleDelete = async () => {
        if (!confirm("确定要解除绑定该账号吗？")) return
        setDeleting(true)
        try {
            await deleteVJudgeAccount(nodeId)
            router.push("/vjudge/account")
            router.refresh()
        } catch (e) {
            console.error(e)
            alert("解除绑定失败")
        } finally {
            setDeleting(false)
        }
    }

    const handleSync = async () => {
        setSyncing(true)
        try {
            await assignVJudgeTask({
                vjudge_node_id: nodeId,
                range: "recent"
            })
            alert("同步任务已提交")
        } catch (e) {
            console.error(e)
            alert("提交同步任务失败")
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                同步最近提交
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                解除绑定
            </Button>
        </div>
    )
}



