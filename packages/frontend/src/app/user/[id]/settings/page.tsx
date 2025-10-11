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
        description: "这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。",
    };

    return (
    <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="md:col-span-1">
        <div className="flex flex-col items-center space-y-4">
                <Avatar className="rounded-md h-50 w-50">
                    <AvatarImage src={data.avatar} alt="用户头像" />
                    <AvatarFallback></AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-center">
                    <h2 className="font-semibold">{data.name}</h2>
                    <span className="font-light">𝚃𝚑𝚎 𝚏𝚞𝚝𝚞𝚛𝚎 𝚒𝚜 𝚒𝚗 𝚜𝚒𝚐𝚑𝚝</span>
                    
                </div>

                </div>
                <div className="mt-5 space-y-3">
                <Button variant="default" className="w-full">
                    <ContactIcon className="mr-2 h-4 w-4" />
                    联系
                </Button>
                <div className="mt-1 flex items-end text-sm">
                    <MailIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{data.email}</span>
                </div>
                <div className="flex items-center text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>注册于 {data.creationTime}</span>
                </div>
                <div className="flex items-center text-sm">
                    <IdCardIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{data.creationOrder}</span>
                </div>
                </div>
        </div>
        <div className="md:col-span-5">
            <Card className="mb-6 relative">
            <CardContent className="pb-12">
                <ContributionGraph />
                <div className="absolute bottom-3 right-4">
                <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                    SOLVED GRAPH
                </span>
                </div>
            </CardContent>
            </Card>
            <Card className="mb-6 relative">
            <CardContent className="pb-12">
                <div className="prose dark:prose-invert max-w-none">
                    {data.description || "暂无描述信息"}
                </div>
                <div className="absolute bottom-3 right-4">
                <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">DESCRIPTION</span>
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
                    <CardDescription className="text-xs text-muted-foreground mb-2">一个很棒的开源项目</CardDescription>
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
                    <CardDescription className="text-xs text-muted-foreground mb-2">一个很酷的应用程序</CardDescription>
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
                    <CardDescription className="text-xs text-muted-foreground mb-2">用户参与的项目</CardDescription>
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
                    <CardDescription className="text-xs text-muted-foreground mb-2">用户的最近活动</CardDescription>
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
