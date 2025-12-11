import { StandardCard, TitleCard } from "@/components/card/card";
import { TreeTable, TreeTableNode } from "@/components/table/treetable";
import { Icond, RecordNode, RecordStatus, SubtaskUserRecord, RECORD_STATUS_COLOR_MAP, RECORD_STATUS_COLOR_MAP_INTER } from "./shared";
import { getRecord } from "@/lib/api";

export function ShowColorfulCard( {status, score} : {status: RecordStatus, score?: number} ) {
  console.log(status);
  return (<>
    <h2 className="font-semibold justify-center mb-2" style={{color: RECORD_STATUS_COLOR_MAP[status]}}>
        <Icond status={status} />{status}{score !== undefined ? ` · ${score}` : null}
      </h2>
  </>)
}

function transformSubtasksToTreeNodes(subtasks: SubtaskUserRecord[], parentId: string = "", pid: string = ""): TreeTableNode[] {
  return subtasks.map((subtask, index) => {
    const displayIndex = index + 1;
    const currentId = parentId ? `${parentId}.${displayIndex}` : `${displayIndex}`;
    const isGroup = subtask.subtask_status.length > 0;
    
    // Define the specific layout for the collapsed root card
    const rootCollapsedContent = parentId === "" ? (
        <div className="flex w-full items-end justify-baseline text-shadow-white min-h-30">
          <div>
            <div className="text-lg font-bold flex items-center gap-1 min-w-1000">
                <Icond size={5} status={subtask.status} animate={true} />
                <span className=" opacity-90">{subtask.score} </span>
                <span className=" opacity-90">{subtask.status}</span>
            </div>
            <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{subtask.time} ms</span>
            ·
            <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{subtask.memory} KB</span>
            ·
            <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{pid}</span>
          </div>
        </div>
    ) : undefined;

    let defaultExpanded = subtask.status !== "Accepted" && subtask.subtask_status.length > 0;

    return {
      id: currentId,
      background: RECORD_STATUS_COLOR_MAP_INTER[subtask.status],
      // Use the new property for the specialized collapsed card view
      collapsedContent: rootCollapsedContent,
      content_title: (
        parentId === "" ? <div className="flex items-center gap-2 text-sm font-medium">
          <div className="flex items-center gap-1">
             <Icond size={2.5} status={subtask.status} />
             <span className="mr-1 border-current font-bold">{subtask.score}</span>
             {subtask.status} <span className="ml-1 mr-1 border-current font-bold">{subtask.time} ms</span>·
          <span className="ml-1 border-current font-bold">{subtask.memory} KB</span>
          </div>
        </div>  : <div className="flex items-center gap-2 text-sm font-medium">
          <span className="font-semibold">{isGroup ? "Subtask" : "Testcase"} {currentId.slice(2, )}</span>
          <div className="flex items-center gap-1">
             <Icond size={2.5} status={subtask.status} />
             {subtask.status}
          </div>
        </div>
      ),
      content: (
        parentId === "" ? <>
        </> :
        <>
          <span className="mr-1 border-current font-bold opacity-50 hover:opacity-100">{subtask.score} pts</span>
          ·
          <span className="ml-1 mr-1 border-current opacity-50 hover:opacity-100">{subtask.time} ms</span>
          ·
          <span className="ml-1 border-current opacity-50 hover:opacity-100">{subtask.memory} KB</span>
        </>
      ),
      children: isGroup ? transformSubtasksToTreeNodes(subtask.subtask_status, currentId) : [],
      defaultExpanded: defaultExpanded,
    };
  });
}

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const fetchdata = await getRecord((await params).id);
  console.log(fetchdata);
  const record: RecordNode = fetchdata?.record || {
    node_id: 1,
    public: {
        record_order: 1,
        record_score: 100,
        record_platform: "平台",
        record_status: "Accepted",
        record_message: "消息",
        record_time: "2025-01-01 00:00:00",
        record_update_time: "2025-01-01 00:00:00",
        code: "#include <iostream>\nint main() { return 0; }",
        code_language: "C++",
        record_url: "URL",
    },
    private: {
        code: "#include <iostream>\nint main() { return 0; }",
        code_language: "C++",
    }
  }
  const subtask_status: SubtaskUserRecord = fetchdata?.judge_data || {
    time: 100,
    memory: 100,
    status: "Wrong Answer",
    score: 0,
    subtask_status: [
      {
        time: 50,
        memory: 50,
        status: "Accepted",
        score: 50,
        subtask_status: [{
            time: 50,
            memory: 50,
            status: "Wrong Answer",
            score: 50,
            subtask_status: []
          },]
      },
      {
        time: 50,
        memory: 50,
        status: "Wrong Answer",
        score: 50,
        subtask_status: []
      },
      {
        time: 50,
        memory: 50,
        status: "Compile Error",
        score: 0,
        subtask_status: []
      },
      {
        time: 50,
        memory: 50,
        status: "Dangerous Code",
        subtask_status: [],
        score: 0,
      },
      // test all colors.
      {
        time: 50,
        memory: 50,
        status: "Time Limit Exceeded",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Memory Limit Exceeded",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Idleness Limit Exceeded",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "NotFound",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Remote Platform Connection Failed",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Remote Platform Refused",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Remote Platform Unknown Error",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Remote Service Unknown Error",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Runtime Error",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Output Limit Exceeded",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Waiting",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Unknown Error",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Deleted",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "OnlyArchived",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Skipped",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Partial Accepted",
        subtask_status: [],
        score: 0,
      },
      {
        time: 50,
        memory: 50,
        status: "Sandbox Error",
        subtask_status: [],
        score: 0,
      },
    ]
  }; // all color test

  const treeData = transformSubtasksToTreeNodes([subtask_status]);

  return <>
    <div className="container mx-auto py-6 px-4 md:px-6">
        <TitleCard title="记录详情" description={`RECORD ${record.public.record_order}`} />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <TreeTable data={treeData} enableRootCollapseCard={true} />
              <div className="my-4" />
              <StandardCard title="代码">
                <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                  <code>
                    {record.private.code}
                  </code>
                </pre>
              </StandardCard>
            </div>
            <div className="lg:col-span-1">
              <StandardCard title="信息">
                <div className="text-sm space-y-2">
                  <div><strong>平台:</strong> {record.public.record_platform}</div>
                  <div><strong>状态:</strong> {record.public.record_status}</div>
                  <div><strong>分数:</strong> {record.public.record_score}</div>
                  <div><strong>提交时间:</strong> {record.public.record_time}</div>
                  <div><strong>最后更新:</strong> {record.public.record_update_time}</div>
                  <div><strong>语言:</strong> {record.private.code_language}</div>
                  <div><strong>原始记录链接:</strong> <a href={record.public.record_url} className="text-blue-600 underline">{record.public.record_url}</a></div>
                </div>
              </StandardCard>
            </div>
        </div>
    </div>
  </>;
}
