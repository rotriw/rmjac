import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

export async function ActionMode({ iden }: { iden: string }) {
  return (<>
    <ButtonGroup className="mb-2">
      <ButtonGroup>
        <Button variant="outline">保存代码</Button>
        <Button variant="outline">历史提交</Button>
        <Button variant="outline">加入题单</Button>
      </ButtonGroup>
    </ButtonGroup>
  </>)
}