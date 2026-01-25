"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react";
import { getBeforeRegister } from "@/api/server/api_user_auth";

export function CaptchaForm({ defaultChallengeCode, challengeVerify, challengeTime, email }: {
  defaultChallengeCode: string,
  challengeVerify: string,
  challengeTime: number,
  email: string
}) {
  const [challenge_code, setChallengeCode] = useState(defaultChallengeCode);
  const [challenge_verify, setChallengeVerify] = useState(challengeVerify);
  const [challenge_time, setChallengeTime] = useState(challengeTime);
  return (<>
    <div className="grid gap-3">
      <Label htmlFor="captcha">验证码</Label>
      <div className="grid grid-cols-6 gap-3 justify-center items-center">
        <Input
          className="col-span-4"
          name="captcha"
          id="captcha"
          type="text"
          placeholder="请输入验证码"
          required
        />
        <img src={challenge_code} className="col-span-2" alt="验证码" />
      </div>
      <span className="text-xs text-muted-foreground text-end">看不清？ <a onClick={async () => {
        const data = await getBeforeRegister({ dark_mode: false, email });
        setChallengeCode(data.challenge_code);
        setChallengeVerify(data.challenge_verify);
        setChallengeTime(data.challenge_time);
      }} className="underline underline-offset-4" >
        重新获取
      </a></span>
    </div>
    <Input
      name="challenge_verify"
      id="challenge_verify"
      type="hidden"
      value={challenge_verify}
    />
    <Input
      name="challenge_time"
      id="challenge_time"
      type="hidden"
      value={challenge_time}
    />
    <Input
      name="challenge_code"
      id="challenge_code"
      type="hidden"
      value={challenge_code}
    />
  </>)
}
