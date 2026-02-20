"use client"

import * as React from "react"
import Link from "next/link"
import { Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormQuery, FormField } from "@/components/tools/query"
import { TypstEditor } from "@/components/editor/typst-editor"
import { TypstRenderer } from "@/components/editor/typst-renderer"
import { toast } from "sonner"
import { postManageAvatar, postManageDescription, postManageNickname } from "@/api/client/api_user_manage"
import { SimplyUser, UserNodePublic } from "@rmjac/api-declare"

interface UserProfileEditClientProps {
  user: SimplyUser
}

export function UserProfileEditClient({ user }: UserProfileEditClientProps) {
  const [nickname, setNickname] = React.useState(user.name ?? "")
  const [description, setDescription] = React.useState((user as SimplyUser & { description?: string }).description ?? "")
  const [avatar, setAvatar] = React.useState((user as SimplyUser & { avatar?: string }).avatar ?? "")
  const [saving, setSaving] = React.useState(false)
  const [formValues, setFormValues] = React.useState<Record<string, string | string[]>>({
    nickname: user.name ?? "",
    description: (user as SimplyUser & { description?: string }).description ?? "",
    avatar: (user as SimplyUser & { avatar?: string }).avatar ?? "",
  })

  const applyUserPublic = (updated: UserNodePublic) => {
    setNickname(updated.name)
    setDescription(updated.description)
    setAvatar(updated.avatar)
    setFormValues((prev) => ({
      ...prev,
      nickname: updated.name,
      description: updated.description,
      avatar: updated.avatar,
    }))
  }

  const handleSaveAll = async () => {
    const nextName = nickname.trim()
    const nextAvatar = avatar.trim()

    if (!nextName) {
      toast.error("昵称不能为空")
      return
    }
    if (!nextAvatar) {
      toast.error("头像地址不能为空")
      return
    }

    try {
      setSaving(true)
      const [nameResp, avatarResp, descResp] = await Promise.all([
        postManageNickname({
          user_iden: user.iden,
          user_id: Number(user.node_id),
          user_name: nextName,
        }),
        postManageAvatar({
          user_iden: user.iden,
          user_id: Number(user.node_id),
          new_avatar: nextAvatar,
        }),
        postManageDescription({
          user_iden: user.iden,
          user_id: Number(user.node_id),
          new_description: description,
        }),
      ])

      applyUserPublic(nameResp.user)
      applyUserPublic(avatarResp.user)
      applyUserPublic(descResp.user)
      toast.success("资料已更新")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "更新失败"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const fields: FormField[] = [
    {
      type: "group",
      title: "基础信息",
      children: [
        { type: "input", name: "nickname", title: "昵称" },
        { type: "input", name: "avatar", title: "头像地址" },
      ],
    },
    {
      type: "group",
      title: "操作",
      children: [
        { type: "button", title: saving ? "保存中" : "保存全部", onClick: handleSaveAll },
      ],
    },
  ]

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">编辑个人资料</h1>
          <p className="text-sm text-gray-500">@{user.iden}</p>
        </div>
        <Link href={`/user/${user.iden}`}>
          <Button variant="outline">返回主页</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormQuery
            fields={fields}
            values={formValues}
            onChange={(values: Record<string, string | string[]>) => {
              setFormValues(values)
              setNickname(String(values.nickname ?? ""))
              setAvatar(String(values.avatar ?? ""))
            }}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">个人简介 (Typst)</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TypstEditor
                value={description}
                onChange={setDescription}
                height="320px"
                onRender={() => {}}
              />
              <div className="border rounded-md p-4 bg-white min-h-[320px] overflow-auto">
                <TypstRenderer content={description} />
              </div>
            </div>
          </div>

          <div className="flex items-center text-xs text-gray-500">
            <ImageIcon className="mr-2 h-4 w-4" />
            修改后将即时更新展示内容。
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
