import type React from "react"

interface MarkdownContentProps {
  children: React.ReactNode
}

export function MarkdownContent({ children }: MarkdownContentProps) {
  return <div className="prose dark:prose-invert max-w-none">{children}</div>
}
