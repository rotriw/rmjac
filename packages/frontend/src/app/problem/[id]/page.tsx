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
      <CardTitle>P1001 A+B Problem</CardTitle>
      <CardDescription className="text-xs text-muted-foreground mb-2">
          时间限制 1 s · 内存限制 256 MB
      </CardDescription>
      <Tabs>
        <TabsList className="" defaultValue="details">
          <TabsTrigger value="details">题面</TabsTrigger>
          <TabsTrigger value="submit">提交代码</TabsTrigger>
          <TabsTrigger value="history">历史提交</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card className="mb-2 shadow-none rounded-sm p-0 w-70">
            <CardContent className="p-2">
              <span className="text-sm text-gray-800">很抱歉，我们暂时无法提供题面。</span>
            </CardContent>
          </Card>
          <div className="flex mb-2">
            <Button className="w-auto mr-2" size="sm">
              前往原题
            </Button>
            <Button className="w-auto" size="sm" variant="outline">
              加入TODO LIST
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="submit">
          <div className="flex mb-2">
            <
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
