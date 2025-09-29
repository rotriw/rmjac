import { CalendarIcon, ContactIcon, GlobeIcon, IdCardIcon, MailIcon, MapPinIcon, UserIcon, Verified } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import ContributionGraph from "@/components/contribution-graph"
import React from "react"
import { Button } from "@/components/ui/button"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function ProfilePage() {

    return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <CardTitle>创建题单</CardTitle>
      <CardDescription className="text-xs text-muted-foreground mb-2">
          CREATE TRAINING
      </CardDescription>
      <Tabs>
        <TabsList className="" defaultValue="details">
          <TabsTrigger value="problems">直接创建</TabsTrigger>
          <TabsTrigger value="details">快捷导入</TabsTrigger>
        </TabsList>
        <TabsContent value="problems">
          <Card className="mb-2 shadow-none rounded-sm p-0">
            <CardContent className="p-3">
              <CardTitle className="text-sm mb-2">基本设置</CardTitle>
              <Input
                name="email"
                id="email"
                type="email"
                placeholder="标题"
                required
              />
            </CardContent>
          </Card>
          <Card className="mb-2 shadow-none rounded-sm p-0">
            <CardContent className="p-3">
              <CardTitle className="text-sm mb-2">权限设置</CardTitle>
              <Input
                name="email"
                id="email"
                type="email"
                placeholder="标题"
                required
              />
            </CardContent>
          </Card>
          <Button className="w-auto mr-2" size="sm">
            创建
          </Button>
        </TabsContent>
        <TabsContent value="details">
          <Tabs>
            <TabsList className="" defaultValue="vjudge">
              <TabsTrigger value="vjudge">Vjudge</TabsTrigger>
              <TabsTrigger value="luogu">洛谷</TabsTrigger>
            </TabsList>
            <TabsContent value="vjudge">
              <Card className="mb-2 shadow-none rounded-sm p-0">
                <CardContent className="p-3">
                  <CardTitle className="text-sm mb-2">链接</CardTitle>
                  <Input
                    name="email"
                    id="email"
                    type="email"
                    placeholder="URL"
                    required
                  />
                    <Button className="w-auto mr-2 mt-2" size="sm">
                    导入
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="luogu">
              <Card className="mb-2 shadow-none rounded-sm p-0">
                <CardContent className="p-3">
                  <CardTitle className="text-sm mb-2">链接</CardTitle>
                  <Input
                    name="email"
                    id="email"
                    type="email"
                    placeholder="URL"
                    required
                  />
                    <Button className="w-auto mr-2 mt-2" size="sm">
                    导入
                  </Button>
                </CardContent>
              </Card>
              <Card className="mb-2 shadow-none rounded-sm p-0">
                <CardContent className="p-3">
                  <CardTitle className="text-sm mb-2">题号粘贴</CardTitle>
                  <Input
                    name="email"
                    id="email"
                    type="email"
                    placeholder="题号"
                    required
                  />
                    <Button className="w-auto mr-2 mt-2" size="sm">
                    导入
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
    )
}
