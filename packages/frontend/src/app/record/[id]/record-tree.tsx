"use client"

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { darken } from 'colorizr';
import { RecordStatus, SubtaskUserRecord, RECORD_STATUS_COLOR_MAP, RECORD_STATUS_COLOR_MAP_INTER } from "./shared";

function ShowOneStatus({status, show_id, score, time, memory, index, total, first, body, isSubtask, depth, expanded, onToggle}: {status: RecordStatus, score: number, time: number, memory: number, index: number, total: number, body: any, first: boolean, isSubtask: boolean, depth?: number, show_id: string, expanded: boolean, onToggle: () => void}) {

  const handleBadgeClick = () => {
    if (isSubtask) {
      onToggle();
    }
  };

  const isOutline = isSubtask && !expanded;
  
  // 原有的背景色逻辑
  const originalBackground = isSubtask 
    ? darken(RECORD_STATUS_COLOR_MAP[status], 30 - (depth || 0) * 10) 
    : RECORD_STATUS_COLOR_MAP[status];

  return (<Card
        className={`gap-2
        ${isSubtask && expanded ? "mb-2" : ""}
        shadow-none p-2
        ${first || (isSubtask && expanded) ? 'rounded-t-md' : "rounded-t-none border-t-0"}
        ${index === total || (isSubtask && expanded) ? 'rounded-b-md' : "rounded-b-none"}
        font-medium text-sm`
        }
        style={{background: (isSubtask && expanded) ? "" : RECORD_STATUS_COLOR_MAP_INTER[status]}}>
      {isSubtask && expanded ? (
        <div className="font-semibold mb-2 cursor-pointer" onClick={handleBadgeClick}>
          Subtask {show_id}
        </div>
      ) : (
        <span>
          <Badge 
            className={`mr-1 ${isSubtask ? "cursor-pointer select-none" : ""}`}
            variant={(isSubtask && !isOutline) ? "outline" : "default"}
            style={{background: (isSubtask && !isOutline) ? "" : originalBackground}}
            onClick={handleBadgeClick}
          >
            <span className="border-r-1 pr-1">{isSubtask ? "Subtask " : ""}{show_id}</span>
            {status} {score}
            <span className="border-l-1 pl-1 border-r-1 pr-1">{time} ms</span>{memory} KB
          </Badge>
        </span>
      )}
      {/* {isSubtask ? <Badge variant={"default"} className="mr-1" style={{background: RECORD_STATUS_COLOR_MAP[status]}}>
          Subtask Detail
        </Badge> : <></>} */}
      {expanded ? body : null}
    </Card>
  )
}

export function ShowSubtaskStatus({subtask_status, id, start, rounded, depth}: {subtask_status: SubtaskUserRecord, id: string, start: boolean, rounded: {top?: boolean, bottom?: boolean} | undefined, depth?: number}) {
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({});

  const toggle = (index: number) => {
    setExpandedMap(prev => ({
      ...prev,
      [index]: !(prev[index] ?? true)
    }));
  };

  const isExpanded = (index: number) => expandedMap[index] ?? true;

  return (<div className={start ? "mt-2" : ""}>
    {subtask_status.subtask_status.map((subtask, index) => {
      // 检查前一个节点是否是 Subtask 且处于展开状态
      // 如果 index 是 0，它总是 first
      // 如果 index > 0：
      //   前一个节点索引是 index - 1
      //   前一个节点是否是 Subtask? (subtask_status.subtask_status[index-1].subtask_status.length > 0)
      //   前一个节点是否展开? (isExpanded(index-1))
      // 如果前一个节点是展开的 Subtask，则当前节点被视为一段新内容的开始（有上圆角）
      // 如果前一个节点是普通节点 或 折叠的 Subtask，则当前节点接在后面（无上圆角）
      
      const prevIsSubtask = index > 0 && subtask_status.subtask_status[index - 1].subtask_status.length > 0;
      const prevExpanded = isExpanded(index - 1);
      
      const isFirst = index === 0 || (prevIsSubtask && prevExpanded);
      const displayIndex = index + 1;
      const currentId = id ? `${id}.${displayIndex}` : `${displayIndex}`;

      return (
      <div key={`${id}-${index}`}>
        <ShowOneStatus 
          show_id={currentId} 
          depth={depth} 
          isSubtask={subtask.subtask_status.length > 0} 
          first={isFirst} 
          status={subtask.status} 
          score={subtask.score} 
          time={subtask.time} 
          memory={subtask.memory} 
          index={index + 1} 
          total={subtask_status.subtask_status.length} 
          expanded={isExpanded(index)}
          onToggle={() => toggle(index)}
          body={
          subtask.subtask_status.length > 0 ?
          <div className="">
            <ShowSubtaskStatus depth={(depth || 0) + 1} subtask_status={subtask} id={currentId} start={false} rounded={undefined} />
          </div>
        : null
        } />
      </div>
    )})}
  </div>)
}
