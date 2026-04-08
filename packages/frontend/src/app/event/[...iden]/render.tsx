import { ShowProblemCard } from "@/api-components/problem/show-problem";
import { MarkProblemButton } from "@/api-components/record/mark-problem-button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Difficulty, Event, Problem, Saved } from "@rmjac/api-declare";
import { Check, ChevronRightIcon, Minus, X } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { postQueryUserSubmission } from "@/api/server/api_record_query";

async function ShowEventCard({event, styles , ...props}: React.ComponentProps<"div"> & {
  styles: React.ClassAttributes<HTMLDivElement> | "",
  event: Event,
}) {

  return (
    <div>
      <Card>
        <CardHeader>
        </CardHeader>
      </Card>
    </div>
  )
}

async function ShowProblems({now_iden, problems}: {problems: [Problem, string][], now_iden?: string}) {
  // 从 cookie 获取用户 ID，查询每道题的通过状态
  let userStatusMap: Map<string, { passed: boolean | undefined, score: number | undefined }> = new Map();
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("_uid")?.value;
    if (uid) {
      const results = await Promise.all(
        problems.map(async ([, iden]) => {
          const fullIden = now_iden ? `${now_iden.replace(/\//g, "/")}/${iden}` : iden;
          try {
            const res = await postQueryUserSubmission({
              user_id: Number(uid),
              problem_iden: fullIden,
              offset: 0,
              show_number: 50,
            });
            const records = res?.records ?? [];
            if (records.length > 0) {
              return [iden, {
                passed: records.some(r => r.record.judge_detail.status === "Accepted"),
                score: Math.max(...records.map(r => "score" in r.record.judge_detail.detail ? (r.record.judge_detail.detail.score ?? 0) : 0)),
              }] as const;
            }
          } catch {}
          return [iden, { passed: undefined, score: undefined }] as const;
        })
      );
      for (const [iden, status] of results) {
        userStatusMap.set(iden, status);
      }
    }
  } catch {}

  return (
    <div className="">
      {problems.map(([problem, iden]) => {
        const status = userStatusMap.get(iden);
        const fullIden = now_iden ? `${now_iden.replace(/\//g, ".")}/${iden}` : iden;
        return (
          <div className="flex items-center gap-1 mb-2" key={problem.name}>
            <Link href={`/problem/${now_iden}${iden}`} className="flex-1 min-w-0">
              <ShowProblemCard
                styles=""
                iden={iden}
                problem={problem}
                variant="inline"
                passed={status?.passed}
                history_score={status?.score}
              />
            </Link>
            <MarkProblemButton problemIden={fullIden} />
          </div>
        );
      })}
    </div>
  );

}
export async function ShowEventPage({iden, event, problems}: {iden: string, event: Event, problems: [Problem, string][]}) {
  return (
    <>
      <Tabs className="mt-2" defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">信息</TabsTrigger>
          <TabsTrigger value="problem">题目列表</TabsTrigger>
        </TabsList>
        <TabsContent value="problem">
          <ShowProblems now_iden={iden} problems={problems} />
        </TabsContent>
        <TabsContent value="info">
          <Card>
            <CardContent>
              <Item>
                <ItemContent>
                  <ItemTitle>开始</ItemTitle>
                  <ItemDescription>{event.start_time}</ItemDescription>
                </ItemContent>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>结束</ItemTitle>
                  <ItemDescription>{event.end_time}</ItemDescription>
                </ItemContent>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>状态</ItemTitle>
                  <ItemDescription>{event.event_status}</ItemDescription>
                </ItemContent>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>类型</ItemTitle>
                  <ItemDescription>{event.event_type}</ItemDescription>
                </ItemContent>
              </Item>
              <Item>
                <ItemContent>
                  <ItemTitle>描述</ItemTitle>
                  <ItemDescription>{event.description.content}</ItemDescription>
                </ItemContent>
              </Item>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}