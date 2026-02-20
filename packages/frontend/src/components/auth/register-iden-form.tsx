"use client"

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { getCheckIden } from "@/api/server/api_user_auth";

const hint: { [key: string]: string } = {
  "Short": "过短，长度需要至少为 2",
  "TooLong": "过长 长度至多为 18",
  "CanParseNumber": "iden不能是数字",
  "Exist": "用户名已存在",
  "NotAllowedChar": "包含非法字符",
  "NoAscii": "包含非ASCII字符",
  "success": "用户名可用"
}

export function RegisterIdenForm({ iden }: { iden?: string }) {
  const [_iden, setIden] = useState(iden || "");
  const [valid, setValidMessage] = useState("");
  return (<div className="grid gap-3">
    <Label htmlFor="user">用户名</Label>
    <Input
      className={`${valid !== "success" ? 'border-red-400': 'border-green-500'} `}
      name="username"
      id="username"
      type="user"
      placeholder=""
      value={_iden}
      onChange={async (e) => {
        const value = e.target.value;
        setIden(value);
        try {
          const data = await getCheckIden({ iden: value });
          setValidMessage(data.message);
        } catch (_error) {
          setValidMessage("error");
        }
      }}
      required
    />
      {valid !== "success" ? <Label className="text-xs text-red-500">{hint[valid] || valid}</Label> : valid === "success" ? <Label className="text-green-500 text-xs gap-2"><CheckIcon className="text-green-500 h-5 w-2"></CheckIcon> 用户名可用</Label> : ""}
    
    <Label htmlFor="user" className="text-xs text-muted-foreground">
      该用户名作为唯一标识符。长度为 3-18 个字符。
    </Label>
  </div>);
}