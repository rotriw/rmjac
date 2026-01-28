"use client"

import * as React from "react"
import { Search as SearchIcon, Folder, File } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { TreeTable, TreeTableNode } from "@/components/table/treetable"

// --- Types ---

export interface SearchNode {
  id: string
  label: string
  icon?: React.ReactNode
  color?: string // Hex code for background color generation
  children?: SearchNode[]
  data?: unknown
  // Metadata for filtering/display
  description?: string
  tags?: string[]
}

export interface SearchProps {
  data: SearchNode[]
  onSelect?: (node: SearchNode) => void
  onSearch?: (term: string) => void
  placeholder?: string
  className?: string
  height?: string | number
  defaultExpanded?: boolean | string[] // true for all, or list of IDs
}

// --- Helper Functions ---

const filterTree = (nodes: SearchNode[], term: string): { nodes: SearchNode[], expandedIds: Set<string> } => {
  const lowerTerm = term.toLowerCase()
  const expanded = new Set<string>()

      const filterNode = (node: SearchNode): SearchNode | null => {
        // Check current node
        const matchLabel = node.label.toLowerCase().includes(lowerTerm)
        const matchDesc = node.description && node.description.toLowerCase().includes(lowerTerm)
        const matchTags = node.tags?.some(t => t && t.toLowerCase().includes(lowerTerm)) // Also check 't' for null/undefined
        
        const isMatch = matchLabel || matchDesc || matchTags
    // Check children
    let filteredChildren: SearchNode[] = []
    if (node.children) {
      filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is SearchNode => child !== null)
    }

    if (isMatch || filteredChildren.length > 0) {
      if (filteredChildren.length > 0) {
        expanded.add(node.id)
      }
      return { ...node, children: filteredChildren }
    }

    return null
  }

  const filtered = nodes
    .map(node => filterNode(node))
    .filter((node): node is SearchNode => node !== null)

  return { nodes: filtered, expandedIds: expanded }
}

// --- Components ---

export function Search({ 
  data, 
  onSelect, 
  onSearch,
  placeholder = "Search...", 
  className,
  height = "400px",
  defaultExpanded = false
}: SearchProps) {
  const [term, setTerm] = React.useState("")
  
  // Filter Data
  const { nodes: filteredData, expandedIds: filterExpandedIds } = React.useMemo(() => {
    if (!term.trim()) {
        // If no search term, handle default expansion
        let initialExpanded = new Set<string>();
        if (defaultExpanded === true) {
             const addAll = (nodes: SearchNode[]) => {
                 nodes.forEach(n => {
                     if (n.children) {
                         initialExpanded.add(n.id);
                         addAll(n.children);
                     }
                 })
             }
             addAll(data);
        } else if (Array.isArray(defaultExpanded)) {
            initialExpanded = new Set(defaultExpanded)
        }
        return { nodes: data, expandedIds: initialExpanded }
    }
    return filterTree(data, term)
  }, [data, term, defaultExpanded])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTerm(value)
    onSearch?.(value)
  }

  // Map SearchNode to TreeTableNode
  const mapToTreeTableNode = React.useCallback((node: SearchNode): TreeTableNode => {
    const hasChildren = node.children && node.children.length > 0
    
    // Default icon logic if not provided
    const Icon = node.icon ? (
        <span className="mr-2">{node.icon}</span>
    ) : (
        hasChildren ? <Folder className="mr-2 h-4 w-4" /> : <File className="mr-2 h-4 w-4" />
    )

    return {
        id: node.id,
        background: node.color,
        defaultExpanded: filterExpandedIds.has(node.id),
        onClick: () => onSelect?.(node),
        content_title: (
            <div className="flex items-center">
                {Icon}
                <span>{node.label}</span>
            </div>
        ),
        content: (
            <div className="flex items-center gap-2 text-sm opacity-80">
                {node.description && <span>{node.description}</span>}
                {node.tags && node.tags.length > 0 && (
                    <div className="flex gap-1">
                        {node.tags.map(tag => (
                            <span key={tag} className="bg-black/10 px-1 rounded text-xs">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        ),
        children: node.children?.map(mapToTreeTableNode)
    }
  }, [filterExpandedIds, onSelect])

  const treeData = React.useMemo(() => filteredData.map(mapToTreeTableNode), [filteredData, mapToTreeTableNode])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={term}
          onChange={handleSearchChange}
          className="pl-8"
        />
      </div>
      
      <div 
        className="rounded-md border bg-background overflow-hidden"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
         <div className="h-full overflow-auto">
            {treeData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                    <p>No results found.</p>
                </div>
            ) : (
                <TreeTable data={treeData} key={term} />
            )}
         </div>
      </div>
    </div>
  )
}
