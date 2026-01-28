"use client"

import { Badge } from "@/components/ui/badge"
import { ProblemTagNodePublic } from "@rmjac/api-declare"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProblemTagProps {
  tag: ProblemTagNodePublic
}

export function ProblemTag({ tag }: ProblemTagProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="cursor-default">
            {tag.tag_name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tag.tag_description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
