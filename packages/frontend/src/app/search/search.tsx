"use client";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";

export function ShowSearchPage({
  iden
}: {
  iden?: string;
}) {
  const [inputText, setInputText] = useState(iden || "");
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭搜索栏
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (<>
    <div ref={containerRef} className="relative group">
      <Input autoFocus={true} size={18} value={inputText} onChange={(e) => setInputText(e.target.value)} className="border p-2 w-full" placeholder="从这里开始。" />
    </div>
  </>)
}