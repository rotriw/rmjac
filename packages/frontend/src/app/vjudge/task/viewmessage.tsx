"use client"
import { RECORD_STATUS_COLOR_MAP } from "@/app/record/[id]/shared";
import { socket } from "@/lib/socket";
import { useEffect, useReducer, useState } from "react";
import { StandardCard } from "@/components/card/card";
import { Loader2 } from "lucide-react";

const reflect: Record<string, string> = {
  "waiting_number": "正在等待远端服务器传回数据...",
  "updating": "正在更新提交状态...",
}

export const ViewVjudgeMessage = () => {
  const [status, setStatus] = useState<string>("waiting");
  const [currMessage, setCurrMessage] = useState<string>("1");
  const [background, setBackground] = useState<string>(RECORD_STATUS_COLOR_MAP["Waiting"]);

  function add_tot(old: number, n: number) {
    return old + n;
  }

  function add_cur(old: number, n: number) {
    return old + n;
  }
  
  function add_meesage(old: string, msg: string) {
    return old + msg + '\n';
  }


  const [totalNumber, setTotalNumber] = useReducer(add_tot, 0);
  const [currentNumber, setCurrentNumber] = useReducer(add_cur, 0);
  const [message, setMessage] = useReducer(add_meesage, "");

  function add_step(msg: string) {
    setCurrentNumber(1);
    setMessage(msg);
  }

  useEffect(() => {
    function onSubmit(ndata: string) {
      const data: {
      n: number | undefined;
      m: string | undefined;
      s: number;
      t: number | undefined;
    } = JSON.parse(ndata);
      console.log("Received submission update:", data);
      if (data.s === 0) { // update task.
        setStatus("updating");
        setTotalNumber(totalNumber + data.n!);
        setBackground(RECORD_STATUS_COLOR_MAP["Accepted"]);
      } else if (data.s === 1) {
        add_step(`[ERROR] ${data.m ? data.m : ""}`);
        setCurrMessage(data.m || "?");
      } else if (data.s === 2) {
        add_step(`[SUCCESS] ${data.m ? data.m : ""}`);
        setCurrMessage(data.m || "?");
      }
    }
    socket.on("submission_update", onSubmit);
    return () => {
      socket.off('submission_update', onSubmit);
    };
  }, []);

  const percentage = totalNumber > 0 ? Math.min(100, Math.max(0, (currentNumber / totalNumber) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="relative w-full min-h-[120px] rounded-sm overflow-hidden bg-muted/30 border border-dashed">
        {/* Progress Bar Layer */}
        <div
            className="absolute top-0 left-0 h-full transition-all duration-700 ease-in-out opacity-20"
            style={{
                width: `${totalNumber > 0 ? percentage : 100}%`,
                background: background
            }}
        />
        
        {/* Content Layer */}
        <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
          <div
            className="text-2xl font-bold mb-2 transition-colors duration-500"
            style={{ color: background }}
          >
            {reflect[status] || "正在处理..."}
          </div>
          
          {totalNumber > 0 ? (
            <div className="space-y-2 w-full max-w-md">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>进度: {currentNumber} / {totalNumber}</span>
                <span>{Math.round(percentage)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${percentage}%`, background: background }}
                />
              </div>
              <div className="text-xs text-muted-foreground italic truncate">
                {currMessage}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              等待远端响应...
            </div>
          )}
        </div>
      </div>

      <StandardCard title="执行日志">
        <div className="bg-neutral-950 rounded-sm p-4 font-mono text-xs text-neutral-400 min-h-[200px] max-h-[400px] overflow-y-auto border border-neutral-800">
          {message ? (
            <pre className="whitespace-pre-wrap break-words leading-relaxed">
              {message}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full opacity-30 italic">
              暂无日志输出
            </div>
          )}
        </div>
      </StandardCard>
    </div>
  );
}
