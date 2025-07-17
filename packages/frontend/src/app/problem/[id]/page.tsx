import { CalendarIcon, ContactIcon, GlobeIcon, IdCardIcon, MailIcon, MapPinIcon, UserIcon, Verified } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import ContributionGraph from "@/components/contribution-graph"
import React from "react"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
    const data = {
        avatar: "https://cdn.rotriw.cn/smallfang/avatar.png",
        name: "smallfang",
        email: "smallfang233@qq.com",
        creationTime: "2023-01-01",
        creationOrder: "1",
        description: "这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。\n这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。\n这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。\n这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。\n这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。\n这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。\n这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。\n这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。\n",
    };

    return (
    <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="md:col-span-5">
        <div style= {{
                background: "linear-gradient(135deg,rgba(165, 207, 157, 0.07) 0%, rgba(255, 255, 255, 0) 500px);",
            }} className="rounded-md">
                <div style= {{
                background: "linear-gradient(180deg,rgba(165, 207, 157, 0.1) 0%, rgba(255, 255, 255, 0) 100px);",
            }} className="rounded-md">
            <Card style={{
              /* backdropFilter: "blur(100px)", */
                background: "#00000000",
            }} className="mb-12 py-5 relative shadow-none rounded-md">
            <CardHeader>
                <CardTitle className="pt-1">P1001 A+B Problem</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                    时间限制 1 s · 内存限制 256 MB · 洛谷
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-7 px-5 text-neutral-800">
                <h2 className="font-bold text-lg pb-3">题目背景</h2>
                这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。这是题目背景。
                <h2 className="font-bold text-lg pt-3 pb-3">题目描述</h2>
                这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。这是一段题目描述。
                <h2 className="font-bold text-lg pt-3 pb-3">输入格式</h2>
                输入格式要求是....<br />输入格式要求是....<br />输入格式要求是....<br />输入格式要求是....<br />输入格式要求是....<br />输入格式要求是....<br />输入格式要求是....<br />
                <h2 className="font-bold text-lg pt-3 pb-3">输出格式</h2>
                输出格式要求是....
                <h2 className="font-bold text-lg pt-3 pb-3">样例</h2>
                <h2 className="font-bold text-lg pt-3 pb-3">数据范围</h2>
                数据范围要求是....
                
            </CardContent>
            </Card>
            </div>
            </div>
        </div>
        <div className="md:col-span-1">
            <div style= {{
                background: "radial-gradient(320px circle at -1px 25.6796875px, green 0%, transparent 25%)",
            }} className="rounded-md">
                <div style= {{
                background: "radial-gradient(320px circle at 1100px 200px, green 0%, transparent 25%)",
            }} className="rounded-md">
            <Card style={{
              backdropFilter: "blur(100px)",
              background: "#00000000",
            }} className="mb-12 py-5 relative shadow-none rounded-md">
            <CardContent className="pb-7 px-5">
                <ContributionGraph />
                <div className="absolute bottom-3 right-4">

                </div>
            </CardContent>
            </Card>
            </div>
            </div>
            <Card style={{
              background: "linear-gradient(180deg, rgba(249, 234, 234, 0.2) 0%, rgba(255, 255, 255, 0) 100%);",
            }} className="mb-6 py-5 relative shadow-none rounded-md">
            <CardContent className="pb-7 px-5">
                <div className="prose dark:prose-invert max-w-none text-md text-gray-900">
                    {data.description || "暂无描述信息"}
                </div>
                <div className="absolute bottom-3 right-4">
                <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                  README.md
                </span>
                </div>
            </CardContent>
            </Card>
            <Tabs defaultValue="repositories">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="repositories">仓库</TabsTrigger>
                <TabsTrigger value="projects">项目</TabsTrigger>
                <TabsTrigger value="activity">活动</TabsTrigger>
            </TabsList>
            <TabsContent value="repositories" className="space-y-4">
                <Card>
                <CardHeader>
                    <CardTitle>awesome-project</CardTitle>
                    <CardDescription>一个很棒的开源项目</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="inline-block h-3 w-3 rounded-full bg-yellow-400"></span>
                        <span className="text-sm">JavaScript</span>
                    </div>
                    <div className="text-sm text-muted-foreground">更新于 3 天前</div>
                    </div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader>
                    <CardTitle>cool-app</CardTitle>
                    <CardDescription>一个很酷的应用程序</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="inline-block h-3 w-3 rounded-full bg-blue-500"></span>
                        <span className="text-sm">TypeScript</span>
                    </div>
                    <div className="text-sm text-muted-foreground">更新于 1 周前</div>
                    </div>
                </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="projects">
                <Card>
                <CardHeader>
                    <CardTitle>项目列表</CardTitle>
                    <CardDescription>用户参与的项目</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>暂无项目数据</p>
                </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="activity">
                <Card>
                <CardHeader>
                    <CardTitle>最近活动</CardTitle>
                    <CardDescription>用户的最近活动</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                </CardContent>
                </Card>
            </TabsContent>
            </Tabs>
        </div>
        </div>
    </div>
    )
}
