import { StandardCard, TitleCard } from "@/components/card/card";
import { TreeTable, TreeTableNode } from "@/components/table/treetable";
import { Icond, RecordStatus, SubtaskUserRecord, RECORD_STATUS_COLOR_MAP, RECORD_STATUS_COLOR_MAP_INTER } from "@/api-components/record/status-utils";
import { getView as getRecordView } from "@/api/server/api_record_view"; // Changed import
import { RecordNode } from "@rmjac/api-declare"; // Import RecordNode from api-declare
import RecordInfoCard from "./record-info-card";

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
                <Icond size={5} status={subtask.status} />
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

    const defaultExpanded = subtask.status !== "Accepted" && subtask.subtask_status.length > 0;

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
  const { id } = await params;
  const fetchdata = await getRecordView({ record_id: id }); // Changed API call and param
  console.log(fetchdata);
  const record: RecordNode = fetchdata?.record;
  const subtask_status: SubtaskUserRecord = fetchdata?.judge_data as unknown as SubtaskUserRecord;
  const treeData = transformSubtasksToTreeNodes([subtask_status], "", id); // Pass id for problem iden display
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
              <RecordInfoCard record={record} recordId={id} />
            </div>
        </div>
    </div>
  </>;
}
