import Link from "next/link"
import { Button } from "@/components/ui/button"
import ProblemContainer from "./problem-container"
import { getView as getProblemView } from "@/api/server/api_problem_view" // Import new API function
import { getUserInfo } from "@/api/server/api_user_info" // Import for checkUserLogin
import {
  ProblemStatementNode,
  ProblemLimitNode,
  ProblemTagNode,
  ProblemNode,
  ProblemModel,
  ContentType,
  RecordEdge, // Import RecordEdge
  SimplyUser, // Import SimplyUser
} from "@rmjac/api-declare" // Import directly from api-declare

// The old Record interface is not directly needed if using RecordEdge from api-declare
// export interface Record {
//   node_id: number
//   public: {
//     record_status: number
//     time_elapsed: number
//     memory_used: number
//     language: string
//     creation_time: string
//   }
// }

// The old ProblemLimitNode, ProblemTagNode, ProblemNode, ProblemModel interfaces are now from api-declare
// No longer need to redefine them here.

interface ProblemData {
  model: ProblemModel
  statement: number
  user_recent_records?: RecordEdge[] // Use RecordEdge
  user_last_accepted_record?: RecordEdge[] // Use RecordEdge
}

async function checkUserLogin(): Promise<boolean> {
  try {
    const response = await getUserInfo() // Use new API function
    return response.is_login
  } catch (error) {
    console.error("Failed to check user login status:", error)
    return false
  }
}


function renderTypstContent(content: ContentType[]) {
  const refname = {
    "background": "题目背景",
    "description": "题目描述",
    "input": "Input",
    "output": "Output",
    "statement": "Statement",
    "problem statement": "题目描述",
    "sample_input": "样例输入",
    "sample_output": "样例输出",
    "constraints": "约定",
    "hint": "提示",
    "source": "来源",
  };
  const parts: string[] = []
  for (const item of content) {
    const title = refname[item.iden as keyof typeof refname] || item.iden
    const body = item.content.replaceAll('\\n', '\n').replaceAll('\n', '\n\n')
    parts.push(`== ${title}\n${body}`)
  }

  return parts.join("\n\n")
}

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [problemDataResponse, isLoggedIn] = await Promise.all([
    getProblemView({ iden: id }), // Use new API function and pass iden as param
    checkUserLogin()
  ])

  // Adapt the response to the ProblemData interface
  const problemData: ProblemData = {
    model: problemDataResponse.model,
    statement: problemDataResponse.statement,
    user_recent_records: problemDataResponse.user_recent_records || [],
    user_last_accepted_record: problemDataResponse.user_last_accepted_record || [],
  }


  if (!problemData) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">题目不存在</h1>
          <p className="text-gray-600 mb-4">找不到ID为 {id} 的题目</p>
          <Link href="/problem">
            <Button>返回题目列表</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { model, statement, user_recent_records } = problemData
  console.log(problemData);
  // Find the statement node by statement ID
  let statementIndex = model.problem_statement_node.findIndex(([stmt]) => stmt.node_id === statement)
  if (statement === model.problem_node.node_id) {
    statementIndex = 0;
  }
  const mainStatement = statementIndex >= 0 ? model.problem_statement_node[statementIndex][0] : null
  const mainLimit = statementIndex >= 0 ? model.problem_statement_node[statementIndex][1] : null
  console.log(mainStatement);
  const fallbackSource = mainStatement?.public?.page_rendered || mainStatement?.public?.page_source || null
  const hasStructuredContent = (mainStatement?.public?.statements?.length || 0) > 0
  const structuredTypstContent = hasStructuredContent && mainStatement?.public?.statements
    ? renderTypstContent(mainStatement.public.statements)
    : null
  return (
    <ProblemContainer
      id={id}
      model={model}
      mainLimit={mainLimit}
      user_recent_records={user_recent_records}
      isLoggedIn={isLoggedIn}
      statement={statement}
      platform={mainStatement?.public?.source || "local"}
      structuredTypstContent={structuredTypstContent}
      fallbackSource={fallbackSource}
    />
  )
}
