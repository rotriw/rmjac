"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagsInputProps {
  value?: string[]
  onChange?: (tags: string[]) => void
  placeholder?: string
  suggestions?: string[]
  className?: string
  disabled?: boolean
}

const commonTags = [
  "动态规划",
  "贪心",
  "二分查找",
  "图论",
  "数论",
  "字符串",
  "数据结构",
  "算法",
  "模拟",
  "暴力枚举",
  "搜索",
  "递归",
  "分治",
  "回溯",
  "数学",
  "几何",
  "排序",
  "树",
  "栈",
  "队列",
  "哈希表",
  "位运算",
  "并查集",
  "最短路",
  "最小生成树",
  "网络流",
  "字符串匹配",
  "博弈论",
  "计算几何",
  "概率论",
  "线性代数"
]

export function TagsInput({
  value = [],
  onChange,
  placeholder = "输入标签后按回车添加",
  suggestions = commonTags,
  className,
  disabled = false
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setShowSuggestions(e.target.value.length > 0)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue.trim())
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  const addTag = (tag: string) => {
    if (!value.includes(tag)) {
      const newTags = [...value, tag]
      onChange?.(newTags)
    }
    setInputValue("")
    setShowSuggestions(false)
  }

  const removeTag = (indexToRemove: number) => {
    const newTags = value.filter((_, index) => index !== indexToRemove)
    onChange?.(newTags)
  }

  const filteredSuggestions = suggestions.filter(
    suggestion =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(suggestion)
  )

  return (
    <div className={cn("relative", className)}>
      {/* Tags Display */}
      <div className="flex flex-wrap gap-2 border rounded-md p-0 items-center shadow-xs">
        {value.map((tag, index) => (
          <div
            key={index}
            className="flex items-center gap-0 p-0 ml-1 px-2 bg-blue-100 text-blue-800 rounded-md text-sm"
          >
            <span className="px-1">{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:bg-blue-200 rounded p-0 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* Input */}
        {!disabled && (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[100px] outline-none bg-transparent text-sm p-2 min-h-8 h-8 outline-none"
          />
        )}

        {disabled && value.length === 0 && (
          <span className="text-gray-500 text-sm">暂无标签</span>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onMouseDown={() => addTag(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}