"use client"

import { useState, useEffect } from "react"
import { StandardCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Users } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getPermissions,
  addEditor,
  removeEditor,
  addViewer,
  removeViewer,
  addPublicViewer,
  removePublicViewer,
} from "./permissions-api"

interface User {
  iden: string
  name: string
}

interface PermissionsEditorProps {
  userIden: string
  trainingIden: string
}

export default function PermissionsEditor({ userIden, trainingIden }: PermissionsEditorProps) {
  const [editors, setEditors] = useState<User[]>([])
  const [viewers, setViewers] = useState<User[]>([])
  const [publicAccess, setPublicAccess] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState<"editor" | "viewer">("editor")
  const [newUserIden, setNewUserIden] = useState("")
  const [newUserName, setNewUserName] = useState("")

  const refreshPermissions = async () => {
    try {
      const perms = await getPermissions(userIden, trainingIden)
      setEditors(
        perms.editors.map((e) => ({
          iden: e.iden,
          name: e.name || e.iden,
        }))
      )
      setViewers(
        perms.viewers.map((v) => ({
          iden: v.iden,
          name: v.name || v.iden,
        }))
      )
      setPublicAccess(perms.viewers.some((v) => v.isPublic))
    } catch (error) {
      toast.error("加载权限信息失败")
    }
  }

  useEffect(() => {
    refreshPermissions()
  }, [userIden, trainingIden])

  const handleAddEditor = async () => {
    if (!newUserIden.trim()) {
      toast.error("请输入用户标识")
      return
    }

    try {
      await addEditor(userIden, trainingIden, newUserIden)
      
      const newEditor: User = {
        iden: newUserIden,
        name: newUserName || newUserIden,
      }
      
      setEditors([...editors, newEditor])
      await refreshPermissions()
      setNewUserIden("")
      setNewUserName("")
      setShowAddDialog(false)
      toast.success("已添加编辑者")
    } catch (error) {
      toast.error("添加编辑者失败")
    }
  }

  const handleAddViewer = async () => {
    if (!newUserIden.trim()) {
      toast.error("请输入用户标识")
      return
    }

    try {
      await addViewer(userIden, trainingIden, newUserIden)
      
      const newViewer: User = {
        iden: newUserIden,
        name: newUserName || newUserIden,
      }
      
      setViewers([...viewers, newViewer])
      await refreshPermissions()
      setNewUserIden("")
      setNewUserName("")
      setShowAddDialog(false)
      toast.success("已添加查看者")
    } catch (error) {
      toast.error("添加查看者失败")
    }
  }

  const handleRemoveEditor = async (iden: string) => {
    if (!confirm("确定要移除此编辑者吗？")) return

    try {
      await removeEditor(userIden, trainingIden, iden)
      
      setEditors(editors.filter(e => e.iden !== iden))
      await refreshPermissions()
      toast.success("已移除编辑者")
    } catch (error) {
      toast.error("移除编辑者失败")
    }
  }

  const handleRemoveViewer = async (iden: string) => {
    if (!confirm("确定要移除此查看者吗？")) return

    try {
      await removeViewer(userIden, trainingIden, iden)
      
      setViewers(viewers.filter(v => v.iden !== iden))
      await refreshPermissions()
      toast.success("已移除查看者")
    } catch (error) {
      toast.error("移除查看者失败")
    }
  }

  const handleOpenAddDialog = (mode: "editor" | "viewer") => {
    setDialogMode(mode)
    setNewUserIden("")
    setNewUserName("")
    setShowAddDialog(true)
  }

  const handleConfirmAdd = () => {
    if (dialogMode === "editor") {
      handleAddEditor()
    } else {
      handleAddViewer()
    }
  }

  const renderUserList = (users: User[], mode: "editor" | "viewer") => (
    <div className="space-y-3">
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          暂无{mode === "editor" ? "编辑者" : "查看者"}
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.iden}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{user.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{user.iden}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => mode === "editor" ? handleRemoveEditor(user.iden) : handleRemoveViewer(user.iden)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <Tabs defaultValue="editors" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            编辑者 ({editors.length})
          </TabsTrigger>
          <TabsTrigger value="viewers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            查看者 ({viewers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editors" className="space-y-4">
          <StandardCard title="编辑权限">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                以下用户可以编辑此训练的内容：
              </div>
              {renderUserList(editors, "editor")}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleOpenAddDialog("editor")}
              >
                <Plus className="h-4 w-4" />
                添加编辑者
              </Button>
            </div>
          </StandardCard>
        </TabsContent>

        <TabsContent value="viewers" className="space-y-4">
          <StandardCard title="查看权限">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div>
                  <div className="font-medium text-sm">公开访问</div>
                  <div className="text-xs text-muted-foreground">允许 guest_user 访问</div>
                </div>
                <Button
                  variant={publicAccess ? "destructive" : "outline"}
                  size="sm"
                  onClick={async () => {
                    try {
                      if (publicAccess) {
                        await removePublicViewer(userIden, trainingIden)
                        toast.success("已关闭公开访问")
                      } else {
                        await addPublicViewer(userIden, trainingIden)
                        toast.success("已开启公开访问")
                      }
                      await refreshPermissions()
                    } catch (error) {
                      toast.error("操作失败")
                    }
                  }}
                >
                  {publicAccess ? "关闭" : "开启"}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                以下用户可以查看此训练：
              </div>
              {renderUserList(viewers, "viewer")}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleOpenAddDialog("viewer")}
              >
                <Plus className="h-4 w-4" />
                添加查看者
              </Button>
            </div>
          </StandardCard>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              添加{dialogMode === "editor" ? "编辑者" : "查看者"}
            </DialogTitle>
            <DialogDescription>
              输入用户的标识（iden）以授予{dialogMode === "editor" ? "编辑" : "查看"}权限。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-iden">用户标识 *</Label>
              <Input
                id="user-iden"
                placeholder="例如：user123"
                value={newUserIden}
                onChange={(e) => setNewUserIden(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-name">用户名称（可选）</Label>
              <Input
                id="user-name"
                placeholder="例如：张三"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              取消
            </Button>
            <Button onClick={handleConfirmAdd}>
              确认添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
