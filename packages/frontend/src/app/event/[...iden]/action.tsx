import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

export async function ActionMode({ iden }: { iden: string }) {
  return (<>
    <ButtonGroup className="mb-2">
      <ButtonGroup>
        <Button variant="outline">置顶此事件</Button>
        <Button variant="outline">转换为训练</Button>
      </ButtonGroup>
    </ButtonGroup>
  </>)
}