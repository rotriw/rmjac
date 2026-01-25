import { CalendarIcon, ContactIcon, MailIcon, CheckCircle2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import React from "react"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/constants" // Import from lib/constants
import { getProfile } from "@/api/server/api_user_info" // Import getProfile
import { SimplyUser } from "@rmjac/api-declare" // Import SimplyUser

const ContributionGraph = () => <div className="h-32 bg-gray-50 rounded flex items-center justify-center text-gray-400">贡献图加载中...</div>

interface UserProfileData {
    user: SimplyUser
    solved_count: number
    submission_count: number
}

async function getUserProfile(id: string): Promise<UserProfileData | null> {
    try {
        const response = await getProfile({ iden: id }); // Use getProfile
        // The API returns SimplyUser, we need to add solved_count and submission_count if they were part of the old API response.
        // Assuming current API structure doesn't return solved_count/submission_count directly, mock them for now.
        // If the backend API for getProfile returns solved_count and submission_count, this can be simplified.
        return {
            user: response.user,
            solved_count: 0, // Mocked for now, need actual API if available
            submission_count: 0, // Mocked for now, need actual API if available
        };
    } catch (error) {
        console.error("Failed to fetch user profile:", error)
        return null
    }
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const profileData = await getUserProfile(id)

    if (!profileData) {
        // Fallback to mock data if API fails for now, or use notFound()
        // For now let's use the mock data provided in the original file but updated
    }

    const data = profileData as UserProfileData; // Cast as UserProfileData since profileData can be null from getUserProfile.

    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Sidebar */}
                <div className="md:col-span-3 space-y-6">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardContent className="pt-6 px-0">
                            <div className="flex flex-col items-center md:items-start space-y-4">
                                <Avatar className="h-48 w-48 rounded-xl border-4 border-white shadow-sm">
                                    <AvatarImage src={data.user.avatar} alt={data.user.name} className="object-cover" />
                                    <AvatarFallback className="text-4xl">{data.user.name[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 text-center md:text-left w-full">
                                    <h1 className="text-2xl font-bold text-gray-900">{data.user.name}</h1>
                                    <p className="text-gray-500 font-medium">@{data.user.iden}</p>
                                    <p className="text-sm text-gray-600 mt-2 italic">𝚃𝚑𝚎 𝚏𝚞𝚝𝚞𝚛𝚎 𝚒𝚜 𝚒𝚗 𝚜𝚒𝚐𝚑𝚝</p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <Button variant="outline" className="w-full justify-start border-gray-200 hover:bg-gray-50">
                                    <ContactIcon className="mr-2 h-4 w-4" />
                                    编辑资料
                                </Button>
                                
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <CheckCircle2 className="mr-3 h-4 w-4 text-green-500" />
                                        <span className="font-medium mr-1">通过题目:</span>
                                        <span className="text-gray-900 font-bold">{data.solved_count}</span>
                                    </div>
                                    {data.user.email && (
                                        <div className="flex items-center text-sm text-gray-600">
                                            <MailIcon className="mr-3 h-4 w-4 text-gray-400" />
                                            <span>{data.user.email}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-sm text-gray-600">
                                        <CalendarIcon className="mr-3 h-4 w-4 text-gray-400" />
                                        <span>注册于 {new Date(data.user.creation_time).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="md:col-span-9 space-y-6">
                    <div className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                        <div style={{
                            background: "radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.05) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)",
                        }} className="p-6">
                            <ContributionGraph />
                        </div>
                    </div>

                    <Card className="border-none shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-6">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">README.md</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="prose dark:prose-invert max-w-none text-gray-800">
                                这是一个用户的个人描述信息，可能包含用户的兴趣爱好、技能等。
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="activity" className="w-full">
                        <TabsList className="w-full justify-start bg-transparent border-b border-gray-200 rounded-none h-auto p-0 space-x-8">
                            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-medium text-gray-500 data-[state=active]:text-gray-900">
                                最近活动
                            </TabsTrigger>
                            <TabsTrigger value="submissions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-medium text-gray-500 data-[state=active]:text-gray-900">
                                提交记录
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-1 font-medium text-gray-500 data-[state=active]:text-gray-900">
                                设置
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="activity" className="pt-6">
                            <Card className="border-dashed border-2 border-gray-100 shadow-none">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <p>暂无活动数据</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="submissions" className="pt-6">
                            <Card className="border-dashed border-2 border-gray-100 shadow-none">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <p>暂无提交记录</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="settings" className="pt-6">
                            <Card className="border-dashed border-2 border-gray-100 shadow-none">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <p>设置选项开发中</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
