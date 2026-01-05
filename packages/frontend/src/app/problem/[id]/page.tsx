import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TypstRenderer } from "@/components/typst-renderer"
import { API_BASE_URL } from "@/api/client/config"
import ProblemContainer from "./problem-container"

export interface Record {
  node_id: number
  public: {
    record_status: number
    time_elapsed: number
    memory_used: number
    language: string
    creation_time: string
  }
}

export interface ContentItem {
  iden: string
  content: string
}

export interface ProblemStatementNode {
  node_id: number
  public: {
    statements: ContentItem[]
    source: string
    creation_time: string
    update_time: string
    sample_group: [string, string][]
    show_order: string[]
  }
}

export interface ProblemLimitNode {
  node_id: number
  public: {
    time_limit: number
    memory_limit: number
  }
}

export interface ProblemTagNode {
  node_id: number
  public: {
    tag_name: string
    tag_description: string
  }
}

export interface ProblemNode {
  node_id: number
  public: {
    name: string
    creation_time: string
  }
}

export interface ProblemModel {
  problem_node: ProblemNode
  problem_statement_node: Array<[ProblemStatementNode, ProblemLimitNode]>
  tag: ProblemTagNode[]
  author?: {
    node_id: number
    avatar: string
    name: string
    iden: string
  }
}

interface ProblemData {
  model: ProblemModel
  statement: number
  user_recent_records?: Record[]
  user_last_accepted_record?: Record[]
}

async function getProblemData(iden: string): Promise<ProblemData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/view/${iden}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch problem ${iden}:`, error)
    return null
  }
}

async function checkUserLogin(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/info`, {
      cache: 'no-store',
      credentials: 'include',
    })
    return response.ok
  } catch {
    return false
  }
}

function renderContent(content: ContentItem[]) {
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

  return (
    <TypstRenderer content={parts.join("\n\n")} />
  )
}

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [problemData, isLoggedIn] = await Promise.all([
    getProblemData(id),
    checkUserLogin()
  ])

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
  return (
    <ProblemContainer
      id={id}
      model={model}
      mainLimit={mainLimit}
      user_recent_records={user_recent_records}
      isLoggedIn={isLoggedIn}
      statement={statement}
    >
        {mainStatement?.public?.statements ? (
          renderContent(mainStatement.public.statements)
        ) : (
          <div className="text-gray-500">暂无题目描述</div>
        )}
    </ProblemContainer>
  )
}
