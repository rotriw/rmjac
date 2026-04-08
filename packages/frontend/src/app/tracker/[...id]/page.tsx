"use server";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { TitleCard } from "@/components/card/card";
import { postView, postViewNextLevelEventOrderedFull, postViewProblems } from "@/api/server/api_event_view";
import { TrackerPageClient } from "./render";
import { Saved, Event } from "@rmjac/api-declare";
import type { ProblemBrief } from "@/lib/tracker-types";

/** 每页加载的事件数 */
const PAGE_SIZE = 30

/** 带 problems 的完整事件行 */
export interface TrackerEventRowData {
  /** 事件 iden（含父路径，如 "codeforces/1923"） */
  iden: string
  event: Saved<Event>
  problems: [ProblemBrief, string][]
}

/** SSR 初始数据：每个 iden 的完整解析结果（含所有子事件 + problems） */
export interface TrackerInitData {
  parentIden: string
  parentName: string
  rows: TrackerEventRowData[]
  /** 该 iden 下总事件数（用于懒加载判断） */
  total: number
}

async function resolveIden(iden: string, desc: boolean, filter?: string): Promise<TrackerInitData> {
  try {
    const eventRes = await postView({ iden });
    const event = eventRes.event;

    // 有 filter 时后端返回全部匹配结果（不分页）；无 filter 时只取第一页
    const hasFilter = !!filter && filter.trim().length > 0;
    const fullRes = await postViewNextLevelEventOrderedFull({
      iden,
      desc,
      filter: filter || undefined,
      offset: hasFilter ? undefined : 0,
      limit: hasFilter ? undefined : PAGE_SIZE,
    });
    if (fullRes.event && fullRes.event.length > 0) {
      return {
        parentIden: iden,
        parentName: event.name,
        total: fullRes.total,
        rows: fullRes.event.map(([childEvent, problems]) => {
          const routeIden = childEvent.iden_list?.[0] || childEvent.sign || String(childEvent.id);
          return {
            iden: `${iden}/${routeIden}`,
            event: childEvent,
            problems,
          }
        }),
      }
    }

    // 叶节点：自身就是事件，获取自身的 problems
    // postViewProblems 返回 Saved<Problem>，转换为 ProblemBrief
    try {
      const problems = await postViewProblems({ iden });
      const briefProblems: [ProblemBrief, string][] = (problems.event || []).map(([p, iden]) => ([
        { id: p.id, name: p.name, sign: p.sign ?? null, platform: p.platform, difficulty: p.difficulty },
        iden,
      ]));
      return {
        parentIden: iden,
        parentName: event.name,
        total: 1,
        rows: [{
          iden,
          event,
          problems: briefProblems,
        }],
      }
    } catch {
      return {
        parentIden: iden,
        parentName: event.name,
        total: 1,
        rows: [{ iden, event, problems: [] }],
      }
    }
  } catch (e) {
    console.error(`Failed to resolve iden "${iden}":`, e);
    return { parentIden: iden, parentName: iden, total: 0, rows: [] }
  }
}

export default async function TrackerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string[] }>
  searchParams: Promise<{ asc?: string; filter?: string; user?: string | string[] }>
}) {
  const path = await params;
  const sp = await searchParams;
  const rawPath = path.id.join("/");
  const idens = rawPath.split(",").map(s => s.trim()).filter(Boolean);
  // 默认降序，?asc=1 时升序
  const desc = sp.asc !== "1";
  const initialFilter = sp.filter ?? "";
  // user 参数：支持多个 &user=atcoder:smallfang&user=codeforces:tourist
  const rawUsers = sp.user
    ? (Array.isArray(sp.user) ? sp.user : [sp.user])
    : [];

  // SSR 批量获取所有子事件 + problems，一次到位
  const initData = await Promise.all(idens.map(iden => resolveIden(iden, desc, initialFilter || undefined)));

  return (
    <>
      <AppSidebar path={`tracker/${rawPath}`} />
      <div className="p-5 bg-white w-full">
        <TitleCard
          title="Tracker"
          description={`追踪: ${idens.join(", ")}`}
        />
        <TrackerPageClient
          initData={initData}
          idens={idens}
          initialAsc={!desc}
          initialFilter={initialFilter}
          initialUsers={rawUsers}
        />
      </div>
    </>
  );
}
