"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagsInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
  className?: string
}

export function TagsInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  className,
}: TagsInputProps) {
  const [input, setInput] = useState("")

  const suggestionList = useMemo(() => {
    const lower = input.trim().toLowerCase()
    if (!lower) return []
    return suggestions
      .filter((item) => item.toLowerCase().includes(lower) && !value.includes(item))
      .slice(0, 8)
  }, [input, suggestions, value])

  const addTag = (raw: string) => {
    const tag = raw.trim()
    if (!tag) return
    if (value.includes(tag)) {
      setInput("")
      return
    }
    onChange([...value, tag])
    setInput("")
  }

  const removeTag = (target: string) => {
    onChange(value.filter((item) => item !== target))
  }

  return (
    <div className="space-y-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            addTag(input)
          }
        }}
        placeholder={placeholder}
        className={cn(
          "flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
          className,
        )}
      />

      {suggestionList.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestionList.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => addTag(item)}
              className="rounded border px-2 py-0.5 text-xs hover:bg-accent"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs"
            >
              {tag}
              <button type="button" title="x" onClick={() => removeTag(tag)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
