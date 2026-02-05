"use client"

import * as React from "react"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StandardCard } from "@/components/card/card"
import { Badge } from "@/components/ui/badge"
import { TypstRenderer } from "@/components/editor/typst-renderer"
import { SimplyUser } from "@rmjac/api-declare"

const ContributionGraph = () => (
  <div className="h-32 bg-gray-50 rounded flex items-center justify-center text-gray-400">贡献图加载中...</div>
)

type UserProfileUser = SimplyUser & {
  description?: string
  bio?: string
}

interface UserProfileClientProps {
  user: UserProfileUser | null
  pass: string[]
}

export function UserProfileClient({ user, pass }: UserProfileClientProps) {
  const [profileUser] = React.useState<UserProfileUser | null>(user)
  const uni_pass = [];
  const passSet = new Set<string>();
  for (const pb of pass) {
    if (!passSet.has(pb)) {
      uni_pass.push(pb);
      passSet.add(pb);
    }
}
  if (!profileUser) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <Card className="border-dashed border-2 border-gray-100 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p>用户信息加载失败</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="pt-6 px-0">
              <div className="flex flex-col items-center md:items-start space-y-4">
                <Avatar className="h-48 w-48 rounded-xl border-4 border-white shadow-sm">
                  <AvatarImage src={profileUser.avatar} alt={profileUser.name} className="object-cover" />
                  <AvatarFallback className="text-4xl">{profileUser.name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 text-center md:text-left w-full">
                  <h1 className="text-2xl font-bold text-gray-900">{profileUser.name}</h1>
                  <p className="text-gray-500 font-medium">@{profileUser.iden}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="mr-3 h-4 w-4 text-green-500" />
                    <span className="font-medium mr-1">通过题目总数:</span>
                    <span className="text-gray-900 font-bold">{uni_pass.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-9 space-y-6">
          <StandardCard title="README.typ">
            <TypstRenderer content={profileUser.description || ""} />
          </StandardCard>

          <StandardCard title="通过" className="w-fit">
            {uni_pass.length === 0 ? (
              <span className="text-gray-400">暂无通过</span>
            ) : (
              uni_pass.map((pb, index) => (
                <Badge key={`${pb}-${index}`} className="m-1" variant="outline">
                  {pb}
                </Badge>
              ))
            )}
          </StandardCard>
        </div>
      </div>
    </div>
  )
}
