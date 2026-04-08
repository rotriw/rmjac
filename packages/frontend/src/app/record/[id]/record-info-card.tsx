import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icond, RECORD_STATUS_COLOR_MAP } from "@/api-components/record/status-utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { RecordStatus } from "@/api-components/record/status-utils";
import type { Saved, Record as JudgeRecord } from "@rmjac/api-declare";

interface RecordInfoCardProps {
  record: Saved<JudgeRecord>;
  recordId: string;
  status: RecordStatus;
}

export default function RecordInfoCard({ record, recordId, status }: RecordInfoCardProps) {
  const showStyle = record.judge_detail.detail;
  const hasScore = "score" in showStyle;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Icond status={status} size={5} />
            <span className="text-lg font-bold" style={{ color: RECORD_STATUS_COLOR_MAP[status] }}>
              {status}
            </span>
          </div>
          {hasScore && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground text-xs">分数</div>
                <div className="font-bold">{showStyle.score}</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground text-xs">时间</div>
                <div className="font-bold">{showStyle.time} ms</div>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground text-xs">内存</div>
                <div className="font-bold">{showStyle.memory} MB</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">记录 ID</span>
              <span className="font-medium">#{recordId}</span>
            </div>

            {record.language && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">语言</span>
                <span className="font-medium">{record.language}</span>
              </div>
            )}

            {record.judge_time && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">提交时间</span>
                <span className="font-medium text-xs">{new Date(String(record.judge_time)).toLocaleString()}</span>
              </div>
            )}

            {record.judge_message && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">消息</span>
                <span className="font-medium text-xs truncate max-w-37.5">{record.judge_message}</span>
              </div>
            )}

            {record.problem_id && (
              <div className="pt-2 border-t">
                <Button variant="outline" size="sm" asChild className="w-full gap-2">
                  <Link href={`/problem/${record.problem_id}`}>
                    查看题目
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
