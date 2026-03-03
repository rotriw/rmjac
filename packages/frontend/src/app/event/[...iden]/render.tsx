import { ShowProblemCard } from "@/api-components/problem/show-problem";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Difficulty, Event, Problem, Saved } from "@rmjac/api-declare";
import { Check, ChevronRightIcon, Minus, X } from "lucide-react";
import Link from "next/link";

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
  return (
    <div className="">
      {problems.map(([problem, iden]) => (
        <Link href={`/problem/${now_iden}${iden}`}>
          <ShowProblemCard styles="" iden={iden} className="mb-2" key={problem.name} problem={problem} variant="inline" />
        </Link>
    ))}
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