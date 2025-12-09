import { StandardCard, TitleCard } from "@/components/card/card";
import { Card } from "@/components/ui/card";
import { ShowSubtaskStatus } from "./record-tree";
import { Icond, RecordNode, RecordStatus, SubtaskUserRecord, RECORD_STATUS_COLOR_MAP } from "./shared";

export function ShowColorfulCard( {status, score} : {status: RecordStatus, score?: number} ) {
  console.log(status);
  return (<>
    <h2 className="font-semibold justify-center mb-2" style={{color: RECORD_STATUS_COLOR_MAP[status]}}>
        <Icond status={status} />{status}{score !== undefined ? ` · ${score}` : null}
      </h2>
  </>)
}


export default function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const record: RecordNode = {
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
  const subtask_status: SubtaskUserRecord = {
    time: 100,
    memory: 100,
    status: "Wrong Answer",
    score: 100,
    subtask_status: [
        {
            time: 100,
            memory: 100,
            status: "Wrong Answer",
            score: 100,
            subtask_status: [{
            time: 100,
            memory: 100,
            status: "Accepted",
            score: 100,
            subtask_status: []
        },

        {
            time: 100,
            memory: 100,
            status: "Accepted",
            score: 100,
            subtask_status: []
        },

        {
            time: 100,
            memory: 100,
            status: "Accepted",
            score: 100,
            subtask_status: []
        }]
        },
        {
            time: 100,
            memory: 100,
            status: "Accepted",
            score: 100,
            subtask_status: []
        },

        {
            time: 100,
            memory: 100,
            status: "Accepted",
            score: 100,
            subtask_status: []
        },

        {
            time: 100,
            memory: 100,
            status: "Accepted",
            score: 100,
            subtask_status: []
        }
    ]
  };
  return <>
    <div className="container mx-auto py-6 px-4 md:px-6">
        <TitleCard title="记录详情" description={`RECORD ${record.public.record_order}`} />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <ShowColorfulCard status={record.public.record_status} score={record.public.record_score} />
              <StandardCard title="子任务状态">
              <ShowSubtaskStatus  subtask_status={subtask_status} id={""} start={true} rounded={undefined} />
              </StandardCard>
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
