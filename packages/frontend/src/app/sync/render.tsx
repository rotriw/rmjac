"use client";

import { useState } from "react";
import { postUpdateAll as postUpdateAtAll } from "@/api/client/api_sync_at";
import { postUpdateAll as postUpdateCfAll } from "@/api/client/api_sync_cf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

function AtcoderSyncCard() {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!handle.trim()) {
      toast.error("请输入 AtCoder 用户名");
      return;
    }

    setLoading(true);
    try {
      await postUpdateAtAll({ handle: handle.trim() });
      toast.success("AtCoder 导入任务已提交");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AtCoder 导入失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AtCoder 导入</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="AtCoder handle，例如 tourist"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
        />
        <div className="text-xs text-muted-foreground">
          说明：提交后将异步同步该账号的全部提交记录。
        </div>
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? "提交中..." : "开始导入"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CodeforcesSyncCard() {
  const [handle, setHandle] = useState("");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!handle.trim() || !key.trim() || !secret.trim()) {
      toast.error("请完整填写 handle、key、secret");
      return;
    }

    setLoading(true);
    try {
      await postUpdateCfAll({
        handle: handle.trim(),
        key: key.trim(),
        secret: secret.trim(),
      });
      toast.success("Codeforces 导入任务已提交");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Codeforces 导入失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Codeforces 导入</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Codeforces handle，例如 tourist"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
        />
        <Input
          placeholder="Codeforces API Key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
        <Input
          placeholder="Codeforces API Secret"
          type="password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
        <div className="text-xs text-muted-foreground">
          说明：提交后将异步同步该账号的全部提交记录。
        </div>
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? "提交中..." : "开始导入"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ManageAction() {
  return (
    <Tabs defaultValue="atcoder" className="w-full">
      <TabsList>
        <TabsTrigger value="atcoder">AtCoder</TabsTrigger>
        <TabsTrigger value="codeforces">Codeforces</TabsTrigger>
      </TabsList>
      <TabsContent value="atcoder" className="mt-4">
        <AtcoderSyncCard />
      </TabsContent>
      <TabsContent value="codeforces" className="mt-4">
        <CodeforcesSyncCard />
      </TabsContent>
    </Tabs>
  );
}