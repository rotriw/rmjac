import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export async function RemoteAction() {
  return (
    <div>
      <form>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>从远程创建</FieldLegend>
          </FieldSet>
        </FieldGroup>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="remote-platform">平台</FieldLabel>
            <Input
              id="remote-platform"
              placeholder="Remote Platform"
              required
            />
            <FieldDescription>
              全小写
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="problem-id">题目ID</FieldLabel>
            <Input
              id="problem-id"
              placeholder="CF1001A"
              required
            />
            <FieldDescription>
              请填写题目准确的ID，仅允许字母和数字组合。
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="url">题目链接</FieldLabel>
            <Input
              id="url"
              placeholder="url"
              required
            />
            <FieldDescription>
              请填写链接，题目将从此处爬取。
            </FieldDescription>
          </Field>
        </FieldGroup>
        <FieldSeparator className="m-2" />
        <FieldGroup>
          <Button type="submit">获取</Button>
        </FieldGroup>
      </form>
    </div>
  )
}


export async function CreateAction({ params }: { params: Promise<{ iden: string }> }) {
  const path = await params;
  return (
    <Tabs defaultValue="remote" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="remote">从远程创建</TabsTrigger>
      </TabsList>
      <TabsContent value="remote">
        <RemoteAction />
      </TabsContent>
    </Tabs>
  )
}