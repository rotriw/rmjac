"use client"
import { RECORD_STATUS_COLOR_MAP, RECORD_STATUS_COLOR_MAP_INTER } from "@/app/record/[id]/shared";
import { socket } from "@/lib/socket";
import { useEffect, useReducer, useState } from "react";
import { darken, hex2oklch, lighten } from "colorizr";
import { StandardCard } from "@/components/card/card";

const reflect: Record<string, string> = {
  "waiting_number": "正在等待远端服务器传回数据...",
  "updating": "正在更新提交状态...",
}

// Function to determine if text should be light or dark based on background color
function getContrastTextColor(hexColor: string): string {
  try {
    const oklch = hex2oklch(hexColor);
    // oklch[0] is lightness (0 to 1). 
    // If lightness is high (> 0.6-0.7), use dark text. Otherwise use light text.
    // Adjust threshold as needed. 
    return oklch[0] > 0.65 ? "black" : "white";
  } catch (e) {
    // Fallback if parsing fails
    return "white";
  }
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
  
  // Calculate dynamic text color
  const textColor = getContrastTextColor(background);

  return (
    <>
      <div className="relative w-full min-h-30 rounded-sm overflow-hidden bg-amber-50 dark:bg-gray-800">
        {/* Progress Bar Layer */}
        <div 
            className="absolute top-0 left-0 h-full transition-all duration-500 ease-in-out"
            style={{ 
                width: `${totalNumber > 0 ? percentage : 100}%`,
                background: background
            }} 
        />
        
        {/* Content Layer */}
        <div 
            className="relative z-10 p-4 h-full flex flex-col justify-end min-h-30 transition-colors duration-500"
            style={{ color: textColor }}
        >
          <div className="text-xl font-semibold flex items-center gap-1 min-w-1000">
              <span className="opacity-90">{ reflect[status] || "未知状态"}</span>
          </div>
          {totalNumber > 0 && (
             <div className="text-sm font-mono mt-1 opacity-80">
                {currentNumber} / {totalNumber} {currMessage}
             </div>
          )}
        </div>
        
      </div>
      <div className="h-2" ></div>
      <StandardCard title="详细信息">
        <code className="whitespace-pre-wrap break-words bg-gray-50 min-h-30 max-h-50 overflow-y-scroll rounded-sm text-neutral-400 text-sm">{message}</code>
      </StandardCard>
    </>
  );
}
