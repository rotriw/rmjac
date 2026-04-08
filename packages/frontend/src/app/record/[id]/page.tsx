import { TitleCard, StandardCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TreeTable, TreeTableNode } from "@/components/table/treetable";
import { Icond, RECORD_STATUS_COLOR_MAP_INTER } from "@/api-components/record/status-utils";
import { postDetail } from "@/api/server/api_record_view";
import { mapJudgeStatusToRecordStatus } from "../utils";
import RecordInfoCard from "./record-info-card";
import type { DetailSubtask, DetailSubtaskChildren, DetailTestcase, Record as JudgeRecord, Saved } from "@rmjac/api-declare";

/**
 * Convert a single DetailSubtask (or DetailTestcase) node into a TreeTableNode,
 * then recursively process its children.
 *
 * The data model:
 *   DetailSubtask  = { status, name, score, time, memory, detail: DetailSubtaskChildren[] }
 *   DetailSubtaskChildren = { "Subtask": DetailSubtask } | { "Testcase": DetailTestcase }
 *   DetailTestcase = { name, status, score, time, memory, detail: DetailSubtask[] }
 *
 * The top-level `detail` from API is itself a DetailSubtask representing the overall result.
 * We wrap it in an array to start, mirroring the old code's `transformSubtasksToTreeNodes([subtask_status], "", id)`.
 */

interface FlatNode {
  status: string;
  name: string;
  score: number;
  time: number;
  memory: number;
  children: FlatNode[];
  isGroup: boolean;
}

const testcaseNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function sortFlatNodesByNameNatural(nodes: FlatNode[]): FlatNode[] {
  return [...nodes].sort((left, right) =>
    testcaseNameCollator.compare(left.name || "", right.name || ""),
  );
}

/** Flatten the tagged-union tree into a simple recursive structure */
function flattenDetailSubtask(subtask: DetailSubtask): FlatNode {
  const children: FlatNode[] = [];

  for (const child of subtask.detail) {
    if ("Subtask" in child) {
      children.push(flattenDetailSubtask(child.Subtask));
    } else if ("Testcase" in child) {
      children.push(flattenDetailTestcase(child.Testcase));
    }
  }

  const sortedChildren = sortFlatNodesByNameNatural(children);

  return {
    status: subtask.status,
    name: subtask.name,
    score: subtask.score,
    time: subtask.time,
    memory: subtask.memory,
    children: sortedChildren,
    isGroup: sortedChildren.length > 0,
  };
}

function flattenDetailTestcase(tc: DetailTestcase): FlatNode {
  const children: FlatNode[] = [];

  // DetailTestcase.detail is Array<DetailSubtask> (sub-subtasks within a testcase)
  for (const sub of tc.detail) {
    children.push(flattenDetailSubtask(sub));
  }

  const sortedChildren = sortFlatNodesByNameNatural(children);

  return {
    status: tc.status,
    name: tc.name,
    score: tc.score,
    time: tc.time,
    memory: tc.memory,
    children: sortedChildren,
    isGroup: sortedChildren.length > 0,
  };
}

/** Convert flattened nodes to TreeTableNode[], same logic as old transformSubtasksToTreeNodes */
function flatNodesToTreeNodes(
  nodes: FlatNode[],
  parentId: string = "",
  pid: string = "",
  rootRecord?: Saved<JudgeRecord>,
): TreeTableNode[] {
  return nodes.map((node, index) => {
    const displayIndex = index + 1;
    const currentId = parentId ? `${parentId}.${displayIndex}` : `${displayIndex}`;

    // 根节点从 judge_detail 中读取状态/分数/时间/内存
    const isRoot = parentId === "";
    const status = isRoot && rootRecord
      ? mapJudgeStatusToRecordStatus(rootRecord.judge_detail.status as any)
      : mapJudgeStatusToRecordStatus(node.status as any);
    const showStyle = rootRecord?.judge_detail.detail;
    const rootScore = isRoot && showStyle && "score" in showStyle ? showStyle.score : node.score;
    const rootTime = isRoot && showStyle && "time" in showStyle ? showStyle.time : node.time;
    const rootMemory = isRoot && showStyle && "memory" in showStyle ? showStyle.memory : node.memory;

    const displayScore = isRoot ? rootScore : node.score;
    const displayTime = isRoot ? rootTime : node.time;
    const displayMemory = isRoot ? rootMemory : node.memory;

    const rootCollapsedContent = isRoot ? (
      <div className="flex w-full items-end justify-baseline text-shadow-white min-h-30">
        <div>
          <div className="text-lg font-bold flex items-center gap-2 min-w-1000">
            <Icond size={5} status={status} />
            <span className="opacity-90">{status}</span>
            <span className="opacity-50">·</span>
            <span className="opacity-90">{displayScore} pts</span>
          </div>
          <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{displayTime} ms</span>
          ·
          <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{displayMemory} MB</span>
          ·
          <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{pid}</span>
        </div>
      </div>
    ) : undefined;

    const defaultExpanded = status !== "Accepted" && node.children.length > 0;

    return {
      id: currentId,
      background: RECORD_STATUS_COLOR_MAP_INTER[status],
      collapsedContent: rootCollapsedContent,
      content_title: (
        isRoot ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="flex items-center gap-1">
              <Icond size={2.5} status={status} />
              {status}
              <span className="opacity-50">·</span>
              <span className="border-current font-bold">{displayScore} pts</span>
              <span className="opacity-50">·</span>
              <span className="border-current font-bold">{displayTime} ms</span>
              <span className="opacity-50">·</span>
              <span className="border-current font-bold">{displayMemory} MB</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="font-semibold">{node.isGroup ? "Subtask" : ""} {node.name} </span>
            <div className="flex items-center gap-1">
              <Icond size={2.5} status={status} />
              {status}
            </div>
          </div>
        )
      ),
      content: (
        isRoot ? <></> : (
          <>
            <span className="mr-1 border-current font-bold opacity-50 hover:opacity-100">{node.score} pts</span>
            ·
            <span className="ml-1 mr-1 border-current opacity-50 hover:opacity-100">{node.time} ms</span>
            ·
            <span className="ml-1 border-current opacity-50 hover:opacity-100">{node.memory} KB</span>
          </>
        )
      ),
      children: node.isGroup ? flatNodesToTreeNodes(node.children, currentId) : [],
      defaultExpanded,
    };
  });
}

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fetchData = await postDetail({ id: Number(id) });
  const record = fetchData?.record;
  const detail = fetchData?.detail;

  // Flatten the tagged-union structure, then wrap in array (same pattern as old code)
  const flatRoot = detail ? flattenDetailSubtask(detail) : null;
  const treeData = flatRoot ? flatNodesToTreeNodes([flatRoot], "", id, record) : [];
  const status = record ? mapJudgeStatusToRecordStatus(record.judge_detail.status) : "Unknown Error";

  return (
    <>
      <AppSidebar path="record" />
      <div className="p-5 bg-white w-full">
        <TitleCard title="记录详情" description={`Record #${id}`} />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <TreeTable data={treeData} enableRootCollapseCard={true} />
            {record && record.code && (
              <>
                <div className="my-4" />
                <StandardCard title="代码">
                  <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                    <code>{record.code}</code>
                  </pre>
                </StandardCard>
              </>
            )}
          </div>
          <div className="lg:col-span-1">
            <RecordInfoCard record={record} recordId={id} status={status} />
          </div>
        </div>
      </div>
    </>
  );
}
