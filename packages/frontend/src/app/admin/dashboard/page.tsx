"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Users,
  BookOpen,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  FileText,
  Settings,
  RefreshCw
} from "lucide-react"

export default function AdminDashboardPage() {
  // Mock data for dashboard
  const stats = {
    totalUsers: 1234,
    activeUsers: 856,
    totalProblems: 156,
    publishedProblems: 142,
    totalTrainings: 48,
    activeTrainings: 12,
    totalSubmissions: 12500,
    todaySubmissions: 342
  }

  const recentActivities = [
    { id: 1, type: "user", action: "新用户注册", target: "testuser", time: "2分钟前" },
    { id: 2, type: "problem", action: "题目创建", target: "P1006 排序练习", time: "5分钟前" },
    { id: 3, type: "training", action: "训练发布", target: "C++进阶训练", time: "10分钟前" },
    { id: 4, type: "submission", action: "代码提交", target: "P1001", time: "15分钟前" },
    { id: 5, type: "user", action: "用户登录", target: "smallfang", time: "20分钟前" }
  ]

  const systemAlerts = [
    { id: 1, level: "warning", message: "服务器内存使用率达到 85%", time: "1小时前" },
    { id: 2, level: "info", message: "自动备份任务完成", time: "2小时前" },
    { id: 3, level: "error", message: "评测队列积压严重", time: "3小时前" },
    { id: 4, level: "success", message: "系统更新成功", time: "5小时前" }
  ]

  const quickActions = [
    { title: "创建用户", description: "添加新的系统用户", icon: Users, href: "/admin/users/create" },
    { title: "创建题目", description: "添加新的编程题目", icon: BookOpen, href: "/admin/problems/create" },
    { title: "创建训练", description: "创建新的训练计划", icon: Target, href: "/admin/trainings/create" },
    { title: "系统设置", description: "配置系统参数", icon: Settings, href: "/admin/settings" }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user":
        return <Users className="h-4 w-4 text-blue-500" />
      case "problem":
        return <BookOpen className="h-4 w-4 text-green-500" />
      case "training":
        return <Target className="h-4 w-4 text-purple-500" />
      case "submission":
        return <FileText className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertBadge = (level: string) => {
    switch (level) {
      case "error":
        return <Badge className="bg-red-100 text-red-800">错误</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">警告</Badge>
      case "info":
        return <Badge className="bg-blue-100 text-blue-800">信息</Badge>
      case "success":
        return <Badge className="bg-green-100 text-green-800">成功</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">未知</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <CardTitle>管理面板</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            系统概览和快速操作
          </CardDescription>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-3 w-3" />
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-2">
        <Card className="shadow-none rounded-sm p-0">
          <CardContent className="p-3">
            <CardTitle className="text-sm mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              总用户数
            </CardTitle>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +10% 较上月
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none rounded-sm p-0">
          <CardContent className="p-3">
            <CardTitle className="text-sm mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              活跃用户
            </CardTitle>
            <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +5% 较上月
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none rounded-sm p-0">
          <CardContent className="p-3">
            <CardTitle className="text-sm mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              题目总数
            </CardTitle>
            <div className="text-2xl font-bold">{stats.totalProblems}</div>
            <p className="text-xs text-muted-foreground">
              +12 较上月
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none rounded-sm p-0">
          <CardContent className="p-3">
            <CardTitle className="text-sm mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              今日提交
            </CardTitle>
            <div className="text-2xl font-bold">{stats.todaySubmissions}</div>
            <p className="text-xs text-muted-foreground">
              +18% 较昨日
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="activities">活动日志</TabsTrigger>
          <TabsTrigger value="alerts">系统告警</TabsTrigger>
          <TabsTrigger value="performance">性能监控</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-none rounded-sm p-0">
              <CardContent className="p-3">
                <CardTitle className="text-sm mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  快速操作
                </CardTitle>
                <CardDescription className="text-xs">
                  常用的管理操作
                </CardDescription>
                <div className="grid gap-3 mt-2">
                  {quickActions.map((action) => (
                    <div key={action.title} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <action.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="text-sm font-medium">{action.title}</h4>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        访问
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none rounded-sm p-0">
              <CardContent className="p-3">
                <CardTitle className="text-sm mb-2 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  系统状态
                </CardTitle>
                <CardDescription className="text-xs mb-3">
                  当前系统运行状态
                </CardDescription>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs">CPU 使用率</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">正常</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">内存使用率</span>
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">85%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">磁盘空间</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">62%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">数据库连接</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">正常</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">评测队列</span>
                    <Badge className="bg-red-100 text-red-800 text-xs">积压</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card className="shadow-none rounded-sm p-0">
            <CardContent className="p-3">
              <CardTitle className="text-sm mb-2 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                最近活动
              </CardTitle>
              <CardDescription className="text-xs mb-3">
                系统中的最近活动记录
              </CardDescription>
              <div className="space-y-2">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-2 border rounded-sm">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-xs">
                        <span className="font-medium">{activity.action}</span>
                        <span className="text-muted-foreground ml-2">{activity.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="shadow-none rounded-sm p-0">
            <CardContent className="p-3">
              <CardTitle className="text-sm mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                系统告警
              </CardTitle>
              <CardDescription className="text-xs mb-3">
                系统告警和通知消息
              </CardDescription>
              <div className="space-y-2">
                {systemAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center space-x-3 p-2 border rounded-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getAlertBadge(alert.level)}
                        <span className="text-xs font-medium">{alert.message}</span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {alert.time}
                      </p>
                    </div>
                    {alert.level === "error" && (
                      <Button variant="outline" size="sm">
                        处理
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="shadow-none rounded-sm p-0">
            <CardContent className="p-3">
              <CardTitle className="text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                性能监控
              </CardTitle>
              <CardDescription className="text-xs mb-3">
                系统性能指标和趋势
              </CardDescription>
              <div className="text-center py-6">
                <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-xs text-muted-foreground mb-3">
                  性能监控图表正在开发中...
                </p>
                <Button variant="outline" size="sm">
                  查看详细监控
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}