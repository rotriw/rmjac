import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export async function ContestInfo() {
  return (
    <div>
      <form className="col-span-1">
        <FieldGroup className="mb-2">
          <Field>
            <FieldLabel htmlFor="remote-platform">平台</FieldLabel>
            <Input
              id="remote-platform"
              placeholder="Remote Platform"
              required
            />
          </Field>
        </FieldGroup>
        <FieldGroup>
          <Button type="submit">导入</Button>
        </FieldGroup>
      </form>
    </div>
  )
}

export async function ProblemInfo() {
  return (
    <div>
      <form className="col-span-1">
        <FieldGroup className="mb-2">
          <Field>
            <FieldLabel htmlFor="remote-platform">平台</FieldLabel>
            <Input
              id="remote-platform"
              placeholder="Remote Platform"
              required
            />
          </Field>
        </FieldGroup>
        <FieldGroup>
          <FieldDescription>
            警告：此功能仅允许用于初始化。
          </FieldDescription>
        </FieldGroup>
        <FieldGroup>
          <Button type="submit">导入</Button>
        </FieldGroup>
      </form>
    </div>
  )
}

export async function ManageAction() {
  return (
    <Tabs defaultValue="cf">
      <TabsList>
        <TabsTrigger value="cf">CF API</TabsTrigger>
        <TabsTrigger value="at_ken">Atcoder Kenkooo API</TabsTrigger>
        <TabsTrigger value="script">脚本</TabsTrigger>
        <TabsTrigger value="manual">手动</TabsTrigger>
      </TabsList>
      <TabsContent value="contest">
        <ContestInfo />
      </TabsContent>
      <TabsContent value="problem">
        <ProblemInfo />
      </TabsContent>
    </Tabs>
  )
}