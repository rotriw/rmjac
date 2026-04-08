"use client"
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useState} from "react";
import {postUpdateProblems} from "@/api/client/api_event_view";



export function UpdateEvent({iden, open, on}: {iden: string, open: any, on: any}) {
  const [platform, setPlatform] = useState("")
  const handleUpdate = async (platform: string, iden: string) => {
    await postUpdateProblems({
      platform,
      iden,
    })
  }
  return (
   <>
     <Dialog open={open} onOpenChange={on}>
       <DialogTrigger>
       </DialogTrigger>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>更新 {iden}。</DialogTitle>
         </DialogHeader>
         <div className="flex items-center gap-2">
           <div className="grid flex-1 gap-2">
             <Label htmlFor="link" className="sr-only">
               平台
             </Label>
             <Input
                 id="platform"
                 placeholder="请填写更新此事件的平台。纯小写"
             />
           </div>
         </div>
         <DialogFooter className="sm:justify-start">
           <DialogClose asChild>
             <Button type="button" onClick={() => handleUpdate((document.getElementById("platform") as any)?.value, iden)}>更新</Button>
           </DialogClose>
         </DialogFooter>
       </DialogContent>

     </Dialog>
   </>
  )
}

export function ActionMode({ iden }: { iden: string }) {
  const [showUpdateEvent, setUpdateEvent] = useState(false)
  return (<>
    <ButtonGroup className="mb-2">
      <ButtonGroup>
        <Button variant="outline">置顶此事件</Button>
        <Button variant="outline" onClick={() => setUpdateEvent(true)}>更新此事件</Button>
        <Button variant="outline">转换为训练</Button>
        <UpdateEvent iden={iden} open={showUpdateEvent} on={setUpdateEvent}></UpdateEvent>
      </ButtonGroup>
    </ButtonGroup>
  </>)
}