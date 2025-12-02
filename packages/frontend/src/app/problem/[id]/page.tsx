import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StandardCard, TitleCard } from "@/components/card/card"
import { TypstRenderer } from "@/components/typst-renderer"
import { API_BASE_URL } from "@/lib/api_client"
import ProblemClient from "./problem-client"
import { CardTitle } from "@/components/ui/card"

interface Record {
  node_id: number
  public: {
    record_status: number
    time_elapsed: number
    memory_used: number
    language: string
    creation_time: string
  }
}

interface ContentItem {
  iden: string
  content: string
}

interface ProblemStatementNode {
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

interface ProblemLimitNode {
  node_id: number
  public: {
    time_limit: number
    memory_limit: number
  }
}

interface ProblemTagNode {
  node_id: number
  public: {
    tag_name: string
    tag_description: string
  }
}

interface ProblemNode {
  node_id: number
  public: {
    name: string
    creation_time: string
  }
}

interface ProblemModel {
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
  } catch (error) {
    return false
  }
}

function renderContent(content: ContentItem[]) {
  const refname = {
    "background": "题目背景",
    "description": "题目描述",
    "input": "输入格式",
    "output": "输出格式",
    "sample_input": "样例输入",
    "sample_output": "样例输出",
    "hint": "提示",
    "source": "来源",
  };
  return content.map((item, index) => {
    console.log(item);
    switch (item.iden) {
      default:
        return <div className="">
          <TypstRenderer content={`== ${refname[item.iden as keyof typeof refname] || item.iden} \n ${item.content.replaceAll('\\n', '\n')}\n\n`} />
        </div>
    }
  })
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

  const { model, statement, user_recent_records, user_last_accepted_record } = problemData
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
    <div className="container mx-auto py-6 px-4 md:px-6">
      <TitleCard 
        title={model.problem_node.public.name} 
        description={`ID: ${id}`}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <StandardCard>
            {mainStatement?.public?.statements ? (
              renderContent(mainStatement.public.statements)
            ) : (
              <div className="text-gray-500">暂无题目描述</div>
            )}
          </StandardCard>

          <ProblemClient
            problemId={id}
            timeLimit={mainLimit?.public?.time_limit}
            memoryLimit={mainLimit?.public?.memory_limit}
            userRecords={user_recent_records}
            isLoggedIn={isLoggedIn}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-2">
            <StandardCard title="操作">
              <Link href={`/problem/${id}/edit`}>
                <Button className="w-full">
                  编辑题目
                </Button>
              </Link>
            </StandardCard>
            {mainLimit && (
              <StandardCard title="限制">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    ⏱️ {mainLimit.public.time_limit}ms
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    💾 {mainLimit.public.memory_limit}MB
                  </Badge>
                </div>
              </StandardCard>
            )}

            <StandardCard title="题目信息">

              {/*<StandardCard title="相关">
                <span className="text-gray-600">{model?.author?.name}</span>
              </StandardCard>*/}

              {model.tag && model.tag.length > 0 && (
                <StandardCard title="标签">
                  <div className="flex flex-wrap gap-2">
                    {model.tag.map((tag) => (
                      <Badge key={tag.node_id} variant="secondary">
                        {tag.public.tag_name}
                      </Badge>
                    ))}
                  </div>
                </StandardCard>
              )}
            </StandardCard>


            <Link href="/problem">
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
