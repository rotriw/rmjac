"use client"

import * as React from "react"
import { Search, SearchNode } from "@/components/search/search"
import { postSearch } from "@/api/client/api_problem_search"
import { ProblemListQuery } from "@rmjac/api-declare"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProblemSearchProps {
    onSelect?: (node: SearchNode) => void
    className?: string
}

export function ProblemSearch({ onSelect, className }: ProblemSearchProps) {
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<SearchNode[]>([])
  
  // Timer for debounce
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleSearch = (term: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      if (!term.trim()) {
          setData([])
          return
      }

      setLoading(true)
      try {
        // Build query - avoid BigInt for JSON serialization
        // Casting inputs to any to bypass TS strictness while using number for runtime safety
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = {
           name: term,
           page: 1,      // treated as number
           per_page: 20  // treated as number
        }

        const res = await postSearch({ query: query as ProblemListQuery })
        
        // Transform result to SearchNode
        const nodes: SearchNode[] = res.problems.map(p => ({
            id: p.iden,
            label: p.model.problem_node.public.name,
            description: p.iden, // Show ID as description
            tags: p.model.tag.map(t => t.public.name),
            data: p
        }))
        setData(nodes)
      } catch (e) {
        console.error("Search failed", e)
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  return (
    <div className={cn("relative w-full", className)}>
        <Search 
            data={data} 
            onSearch={handleSearch}
            onSelect={onSelect} 
            placeholder="Search problems..." 
            className="w-full"
            height={300}
        />
        {loading && (
            <div className="absolute top-3 right-3 pointer-events-none">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        )}
    </div>
  )
}
