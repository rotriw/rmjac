"use client"

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { getCheckIden } from "@/api/server/api_user_info";


export function RegisterIdenForm({ iden }: { iden?: string }) {
  const [_iden, setIden] = useState(iden || "");
  const [isValid, setIsValid] = useState(0);
  return (<div className="grid gap-3">
    <Label htmlFor="user">用户名</Label>
    <Input
      className={`${isValid === 1 ? 'border-red-400': isValid === 2 ? 'border-green-500' : ''} `}
      name="username"
      id="username"
      type="user"
      placeholder=""
      value={_iden}
      onChange={async (e) => {
        const value = e.target.value;
        setIden(value)
        if (value.length < 3 || value.length > 20) {
            setIsValid(0);
            setIden(value)
            return;
        }
        try {
          const data = await getCheckIden({ id: value });
          if (data?.exists === false) {
            setIsValid(2);
          } else {
            setIsValid(1);
          }
        } catch (_error) {
          setIsValid(1);
        }
      }}
      required
    />
      {isValid === 1 ? <Label className="text-xs text-red-500">用户名已存在或格式不正确</Label> : isValid === 2 ? <Label className="text-green-500 text-xs gap-2"><CheckIcon className="text-green-500 h-5 w-2"></CheckIcon> 用户名可用</Label> : ""}
    
    <Label htmlFor="user" className="text-xs text-muted-foreground">
      该用户名作为唯一标识符，只能包含字母、数字和下划线。长度为 3-20 个字符。
    </Label>
  </div>);
}