import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Difficulty, Problem, Saved } from "@rmjac/api-declare";
import { Check, ChevronRightIcon, Minus, X } from "lucide-react";

function time_to_string(time: number) {
  if (time >= 1000) {
    return `${(time / 1000).toFixed(2)}s`;
  }
  return `${time}.00ms`;
}

function memory_to_string(memory: number) {
  if (memory >= 1024) {
    return `${(memory / 1024).toFixed(2)}GB`;
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

async function ShowProblemCard({history_score, passed, problem, variant, styles, with_tag, ...props}: React.ComponentProps<"div"> & {
  styles: React.ClassAttributes<HTMLDivElement> | "",
  problem: Saved<Problem>,
  variant: "inline" | "total",
  with_tag?: boolean,
  history_score?: number,
  passed?: boolean
}) {
  if (variant === "inline") {
    return (
      <Item variant={with_tag ? "default" : "outline"} size="sm">
        <ItemMedia>
          {
            passed === true ? <Check className="size-3 text-green-800" /> : passed === false ? <X className="size-3 text-red-800" /> : <Minus className="size-3" />
          }
          {
            history_score !== undefined ? <span className={`${passed === true ? "text-green-800" : "text-red-800"} text-xs`}> {history_score}</span> : null
          }
        </ItemMedia>
        <ItemContent>
          <ItemTitle><div><span className="font-bold">{problem.iden}</span> {problem.name}</div></ItemTitle>
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
          <CardDescription>{problem.iden}</CardDescription>
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
        <CardContent>
          描述：{problem.description.content === "no-content" ? "暂无描述" : problem.description.content}
        </CardContent>
      </Card>
    </div>
  )
}


export async function ShowProblemPage({problem}: {problem: Saved<Problem>}) {
  return (
    <>
        <ShowProblemCard problem={problem} variant="total" passed={false} />
    </>
  );
}