"use client";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

interface CompleteItem {
  key: string;
  label: string;
  description: string;
  insertText: string;
  /** token 是否与此指令相关（用于高亮等） */
  match: (token: string) => boolean;
  /** token 是否还需要补全（排除已完整输入的情况） */
  completable: (token: string) => boolean;
}

const CompleteMethod: CompleteItem[] = [
  {
    key: "diff-number",
    label: "diff-number:<from>-<end>",
    description: "按难度范围匹配（匹配范围）",
    insertText: "diff-number:",
    match: (token) =>
      "diff-number:".startsWith(token) ||
      "diff-number".startsWith(token) ||
      token.startsWith("diff-number") ||
      token.startsWith("diff-"),
    completable: (token) =>
      !token.startsWith("diff-number:") &&
      ("diff-number:".startsWith(token) ||
        "diff-number".startsWith(token) ||
        token.startsWith("diff-")),
  },
  {
    key: "alias",
    label: "*数字",
    description: "匹配难度",
    insertText: "*",
    match: (token) => "*".startsWith(token) || token.startsWith("*"),
    completable: (token) => !token.startsWith("*") && "*".startsWith(token),
  },
  {
    key: "event",
    label: "+event",
    description: "仅搜索事件",
    insertText: "+event",
    match: (token) => "+event".startsWith(token) || token.startsWith("+"),
    completable: (token) =>
      !token.startsWith("+event") &&
      ("+event".startsWith(token) || token.startsWith("+")),
  },
  {
    key: "search-at",
    label: "@",
    description: "仅在选定平台中搜索",
    insertText: "@",
    match: (token) => "@platform".startsWith(token) || token.startsWith("@"),
    completable: (token) => false,
  },
];

const getTokenInfo = (text: string, cursor: number) => {
  const head = text.slice(0, cursor);
  const lastSpace = head.lastIndexOf(" ");
  const start = lastSpace === -1 ? 0 : lastSpace + 1;
  return {
    token: head.slice(start),
    start,
    end: cursor,
  };
};

const getDiffNumberHint = (token: string) => {
  if (!token.startsWith("diff-number:")) return null;
  const value = token.slice("diff-number:".length).trim();
  if (!value) return "示例：diff-number:1-3 或 diff-number:2";
  if (value.includes("-")) {
    const [from, end] = value.split("-");
    if (!from || !end) return "范围示例：diff-number:1-3";
    if (!/^[0-9]+$/.test(from) || !/^[0-9]+$/.test(end)) return "难度必须是数字";
    return `范围：${from}-${end}`;
  }
  if (!/^[0-9]+$/.test(value)) return "难度必须是数字";
  return `精确难度：${value}`;
};

/** 判断一个 token 是否是特殊指令（前缀或完整匹配） */
const isSpecialToken = (token: string): boolean => {
  return CompleteMethod.some(
    (item) => item.match(token) && token.length > 0,
  );
};

/** 将输入文本按空格分割为 token 并标记特殊指令 */
const tokenize = (text: string): { text: string; special: boolean }[] => {
  const result: { text: string; special: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === " ") {
      // 收集连续空格
      let spaces = "";
      while (i < text.length && text[i] === " ") {
        spaces += " ";
        i++;
      }
      result.push({ text: spaces, special: false });
    } else {
      // 收集一个 token
      let token = "";
      while (i < text.length && text[i] !== " ") {
        token += text[i];
        i++;
      }
      result.push({ text: token, special: isSpecialToken(token) });
    }
  }
  return result;
};

export function ShowSearchPage({
  iden
}: {
  iden?: string;
}) {
  const [inputText, setInputText] = useState(iden || "");
  const [showResults, setShowResults] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ left: 0, top: 0 });
  const [mirrorStyle, setMirrorStyle] = useState<React.CSSProperties>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const tokenInfo = useMemo(() => {
    const cursor = Math.max(0, Math.min(cursorPosition, inputText.length));
    return getTokenInfo(inputText, cursor);
  }, [inputText, cursorPosition]);

  const suggestions = useMemo(() => {
    if (!showResults) return [];
    if (!tokenInfo.token) return CompleteMethod;
    return CompleteMethod.filter((item) => item.completable(tokenInfo.token));
  }, [showResults, tokenInfo.token]);

  // 当建议列表变化时，重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length, tokenInfo.token]);

  // 高亮渲染的 token 列表
  const highlightTokens = useMemo(() => tokenize(inputText), [inputText]);

  /** 应用选中的补全项 */
  const applySuggestion = useCallback((suggestion: CompleteItem) => {
    const cursor = inputRef.current?.selectionStart ?? inputText.length;
    const info = getTokenInfo(inputText, cursor);
    const nextText = `${inputText.slice(0, info.start)}${suggestion.insertText}${inputText.slice(info.end)}`;
    setInputText(nextText);
    setShowResults(true);
    const nextCursor = info.start + suggestion.insertText.length;
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
      setCursorPosition(nextCursor);
    });
  }, [inputText]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setShowResults(true);
    setCursorPosition(e.target.selectionStart ?? e.target.value.length);
  };

  const handleCursorUpdate = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    setCursorPosition(target.selectionStart ?? target.value.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 上下键切换选中项
    if (e.key === "ArrowDown" && suggestions.length > 0 && showResults) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length > 0 && showResults) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }

    // Tab 补全（有建议时补全，无建议时插入空格）
    if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions.length > 0) {
        applySuggestion(suggestions[selectedIndex]);
      } else {
        // 无建议时插入空格
        const cursor = inputRef.current?.selectionStart ?? inputText.length;
        const nextText = `${inputText.slice(0, cursor)} ${inputText.slice(cursor)}`;
        setInputText(nextText);
        const nextCursor = cursor + 1;
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(nextCursor, nextCursor);
          setCursorPosition(nextCursor);
        });
      }
      return;
    }

    // Escape 关闭
    if (e.key === "Escape") {
      setShowResults(false);
      return;
    }
  };

  useLayoutEffect(() => {
    if (!inputRef.current) return;
    const style = window.getComputedStyle(inputRef.current);
    setMirrorStyle({
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      textTransform: style.textTransform,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      borderLeft: style.borderLeftWidth + " solid transparent",
      borderRight: style.borderRightWidth + " solid transparent",
      borderTop: style.borderTopWidth + " solid transparent",
      borderBottom: style.borderBottomWidth + " solid transparent",
      boxSizing: style.boxSizing as React.CSSProperties["boxSizing"],
      width: `${inputRef.current.offsetWidth}px`,
      height: `${inputRef.current.offsetHeight}px`,
    });
  }, []);

  // 当前 token 起始位置对应的镜像文本（用于定位下拉框，只在空格分词后才变化）
  const tokenStartMirrorText = useMemo(() => {
    return inputText.slice(0, tokenInfo.start);
  }, [inputText, tokenInfo.start]);

  useLayoutEffect(() => {
    if (!showResults) return;
    if (!inputRef.current || !mirrorRef.current || !caretRef.current || !containerRef.current) return;
    const caretRect = caretRef.current.getBoundingClientRect();
    const mirrorRect = mirrorRef.current.getBoundingClientRect();
    const inputRect = inputRef.current.getBoundingClientRect();
    const scrollLeft = inputRef.current.scrollLeft;
    const rawLeft = caretRect.left - mirrorRect.left - scrollLeft;
    const top = inputRect.height - 10;
    setDropdownPos({ left: rawLeft, top });
  }, [tokenStartMirrorText, showResults]);

  useLayoutEffect(() => {
    if (!showResults) return;
    if (!cardRef.current || !containerRef.current) return;
    const maxLeft = containerRef.current.clientWidth - cardRef.current.offsetWidth;
    if (maxLeft <= 0) return;
    setDropdownPos((prev) => {
      const nextLeft = Math.max(0, Math.min(prev.left, maxLeft));
      if (nextLeft === prev.left) return prev;
      return { ...prev };
    });
  }, [suggestions.length, showResults, dropdownPos.left]);

  const diffHint = getDiffNumberHint(tokenInfo.token);

  return (
    <>
      <div ref={containerRef} className="relative group">
        {/* 实际输入框 — 文字透明，由下方高亮层渲染可见文字 */}
        <Input
          ref={inputRef}
          autoFocus={true}
          size={18}
          value={inputText}
          onChange={handleChange}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          onClick={handleCursorUpdate}
          onKeyUp={handleCursorUpdate}
          className="border p-2 w-full h-10 text-xl caret-foreground text-transparent"
          placeholder="从这里开始。"
        />
        {/* 高亮覆盖层 — 与输入框完全重叠，渲染带高亮的文本 */}
        <div
          aria-hidden
          className="absolute left-0 top-0 pointer-events-none flex items-center whitespace-pre overflow-hidden"
          style={mirrorStyle}
        >
          <span
            style={{
              marginLeft: -(inputRef.current?.scrollLeft ?? 0),
            }}
          >
            {highlightTokens.map((tok, i) =>
              tok.special ? (
                <span
                  key={i}
                  className="bg-primary/15 text-primary rounded-sm"
                >
                  {tok.text}
                </span>
              ) : (
                <span key={i} className="text-foreground">{tok.text}</span>
              ),
            )}
          </span>
        </div>
        {/* 光标位置镜像（隐藏，用于定位下拉框，使用 token 起始位置） */}
        <div
          ref={mirrorRef}
          aria-hidden
          className="absolute left-0 top-0 pointer-events-none opacity-0 whitespace-pre border-none"
          style={mirrorStyle}
        >
          <span>{tokenStartMirrorText || "\u200b"}</span>
          <span ref={caretRef}>|</span>
        </div>
        {showResults && suggestions.length > 0 && (
          <Card
            ref={cardRef}
            className="absolute z-10 p-0 mt-2 w-full max-w-md bg-background/5 shadow-lg backdrop-blur-md border-none rounded-md"
            style={{ left: dropdownPos.left, top: dropdownPos.top }}
          >
            <CardContent className="p-1">
              <div className="flex flex-col gap-1">
                {suggestions.map((item, index) => (
                  <div
                    key={item.key}
                    className={`flex items-start justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors cursor-pointer ${
                      index === selectedIndex
                        ? "bg-primary/5 text-primary"
                        : "hover:bg-muted/60"
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // 阻止 input 失焦
                      applySuggestion(item);
                      setShowResults(false);
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.key === "diff-number" && diffHint ? diffHint : item.description}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {index === selectedIndex ? "Tab" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
