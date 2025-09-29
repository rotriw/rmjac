import { CalendarIcon, ContactIcon, GlobeIcon, IdCardIcon, MailIcon, MapPinIcon, UserIcon, Verified } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import ContributionGraph from "@/components/contribution-graph"
import React from "react"
import { Button } from "@/components/ui/button"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"

export default function ProfilePage() {

    return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <CardTitle>示例题单</CardTitle>
      <CardDescription className="text-xs text-muted-foreground mb-2">
          User1/tanxin1
      </CardDescription>
      <div className="flex mb-2">
        <Button className="w-auto mr-2" size="sm">
          订阅题单
        </Button>
        <Button className="w-auto" size="sm" variant="outline">
          加入TODO LIST
        </Button>
      </div>
      <Tabs>
        <TabsList className="" defaultValue="details">
          <TabsTrigger value="problems">题目</TabsTrigger>
          <TabsTrigger value="details">详情</TabsTrigger>
          <TabsTrigger value="rank">排名</TabsTrigger>
          <TabsTrigger value="history">设置</TabsTrigger>
        </TabsList>
        <TabsContent value="problems">
          <Card className="mb-2 shadow-none rounded-sm p-0">
            <CardContent className="p-3">
              <CardTitle className="text-sm mb-2">第一章节</CardTitle>
              <span className="text-sm text-gray-800">章节解释1233333</span>
              <Card className="shadow-none rounded-md rounded-b-none p-2 text-gray-900 font-medium text-sm bg-green-700/10">
                <span><Badge className="bg-green-700/60 mr-1"><span className="border-r-1 pr-1">A</span>AC 100</Badge>LGP1001 A+B Problem<Badge variant="outline" className="ml-1 text-red-800">*2100</Badge></span>
              </Card>
              <Card className="mb-2 shadow-none rounded-md p-2  rounded-t-none border-t-0 text-gray-900 font-medium text-sm bg-red-700/10">
                <span><Badge className="bg-red-700/60 mr-1"><span className="border-r-1 pr-1">B</span>WA 40</Badge> LGP1002 消消乐<Badge variant="outline" className="ml-1 text-red-800">*2500</Badge></span>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details">
          <div className="flex mb-2">
            <Button className="w-auto mr-2" size="sm">
              保存
            </Button>
            <Button className="w-auto mr-2" size="sm"  variant="outline">
              从远程同步
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    )
}
