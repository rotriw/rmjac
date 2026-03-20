import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Difficulty, Problem, Saved } from "@rmjac/api-declare";
import { Check, ChevronRightIcon, Minus, X } from "lucide-react";
import { cookies } from "next/headers";
import { postQueryUserSubmission } from "@/api/server/api_record_query";
import { DifficultyBadge } from "@/components/problem/difficulty-badge";

function time_to_string(time: number) {
  if (time >= 1000) {
    return `${(time / 1000).toFixed(2)}s`;
  } else if (time < 0) {
    return `未知`
  }
  return `${time}.00ms`;
}

function memory_to_string(memory: number) {
  if (memory >= 1024) {
    return `${(memory / 1024).toFixed(2)}GB`;
  } else if (memory < 0) {
    return `未知`
  }
  return `${memory}MB`;
}

function get_color_by_passed(passed: boolean | undefined) {
  if (passed === true) {
    return "green-800";
  } else if (passed === false) {
    return "red-800";
  } else {
    return "neutral-800";
  }
}

export async function ShowProblemCard({iden, history_score, passed, problem, variant, styles, with_tag, ...props}: React.ComponentProps<"div"> & {
  styles: React.ClassAttributes<HTMLDivElement> | "",
  problem: Problem,
  iden: String,
  variant: "inline" | "total",
  with_tag?: boolean,
  history_score?: number,
  passed?: boolean
}) {
  if (variant === "inline") {
    return (
      <Item variant={with_tag ? "default" : "outline"} size="sm" {...props}>
        <ItemMedia>
          {
            passed === true ? <Check className="size-3 text-green-800" /> : passed === false ? <X className="size-3 text-red-800" /> : <Minus className="size-3" />
          }
          {
            history_score !== undefined ? <span className={`${passed === true ? "text-green-800" : "text-red-800"} text-xs`}> {history_score}</span> : null
          }
        </ItemMedia>
        <ItemContent>
          <ItemTitle><div><span className="font-bold">{iden}</span> {problem.name}</div>  <DifficultyBadge difficulty={problem.difficulty} size="sm" />
            </ItemTitle>
        </ItemContent>
          <ItemActions>
            <ChevronRightIcon className="size-4" />
          </ItemActions>
      </Item>
    );
  }
  return (
    <div>
      <Card className={`${passed ? "bg-linear-140 from-green-200/20 to-green-300/0 border-white" : ""}`}>
        <CardHeader>
          <CardTitle className={`mt-0 text-sm text-${get_color_by_passed(passed)}`}>
            <span className="inline-flex items-center">
              {passed === true ? <Check className="size-3 mr-1" /> : passed === false && <X className="size-3 text-red-800 mr-1" />}
              {history_score} {problem.name}</span>
          </CardTitle>
          <CardDescription>
            <span className="inline-flex items-center gap-2">
              {problem.iden}
              <DifficultyBadge difficulty={problem.difficulty} size="sm" />
            </span>
          </CardDescription>
          <CardAction>
            <div className="flex h-5 items-center gap-2 text-sm w-fit">
              <Item variant="default" className="w-fit">
                <ItemTitle>时间限制</ItemTitle>
                <ItemContent>
                  {time_to_string(problem.limit.time_limit)}
                </ItemContent>
              </Item>
              <Separator orientation="vertical" />
              <Item variant="default" className="w-fit">
                <ItemTitle>内存限制</ItemTitle>
                <ItemContent>
                  {memory_to_string(problem.limit.memory_limit)}
                </ItemContent>
              </Item>
            </div>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  )
}


export async function ShowProblemPage({problem, iden}: {problem: Problem, iden: String}) {
  let passed: boolean | undefined = undefined;
  let historyScore: number | undefined = undefined;

  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("_uid")?.value;
    if (uid) {
      const res = await postQueryUserSubmission({
        user_id: Number(uid),
        problem_iden: String(iden),
        offset: 0,
        show_number: 50,
      });
      const records = res?.records ?? [];
      if (records.length > 0) {
        passed = records.some(r => r.record.judge_detail.status === "Accepted");
        historyScore = Math.max(...records.map(r => "score" in r.record.judge_detail.detail ? (r.record.judge_detail.detail.score ?? 0) : 0));
      }
    }
  } catch {
    // 查询失败时不影响页面展示
  }

  return (
    <>
        <ShowProblemCard iden={iden} problem={problem} variant="total" styles="" passed={passed} history_score={historyScore} />
    </>
  );
}