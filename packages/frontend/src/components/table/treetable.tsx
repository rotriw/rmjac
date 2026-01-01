"use client"

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { darken, lighten } from "colorizr";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type TableNodeBackground = string;

export interface TreeTableNode {
  id: string | number;
  content_title?: React.ReactNode;
  content: React.ReactNode;
  collapsedContent?: React.ReactNode;
  background?: TableNodeBackground;
  children?: TreeTableNode[];
  defaultExpanded?: boolean;
  node_index?: number;
  onClick?: () => void;
}

export interface TreeTableProps {
  data: TreeTableNode[];
  className?: string;
  enableRootCollapseCard?: boolean;
  rootCollapseCardClassName?: string;
}

const TreeNode = ({ 
  node, 
  depth = 0,
  index,
  enableRootCollapseCard = false,
  rootCollapseCardClassName,
}: { 
  node: TreeTableNode; 
  depth?: number;
  isLast?: boolean;
  index: number;
  enableRootCollapseCard?: boolean;
  rootCollapseCardClassName?: string;
}) => {
  const [expanded, setExpanded] = useState(node.defaultExpanded ? true : false);
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    }
    if (node.onClick) {
      node.onClick();
    }
  };

  const lighterColor = node.background ? lighten(node.background, 5) : undefined;
  const lightestColor = node.background ? lighten(node.background, 1) : undefined;
  const darkerColor = node.background ? darken(node.background, 60) : undefined;
  const darkestColor = node.background ? darken(node.background, 65) : undefined;

  // Root collapsed logic
  const isRoot = depth === 0;
  // Only apply the special collapsed root card style if enabled and conditions met
  const isCollapsedRoot = enableRootCollapseCard && isRoot && !expanded;

  return (
    <div className="flex flex-col w-full">
      <div 
        className={cn(
          "flex items-center w-full transition-all duration-300 ease-in-out relative overflow-hidden",
          !isCollapsedRoot ? "border-b last:border-b-0" : "", // Border separator when not collapsed card
          (hasChildren || node.onClick) ? "cursor-pointer hover:brightness-95 active:brightness-90" : ""
        )}
        style={{
          // Row background: Always use the alternating light colors.
          // The "Dark Card" effect is now handled by the inner Morphing Box.
          backgroundColor: index % 2 ? lighterColor : lightestColor,
          color: darkestColor
        }}
        onClick={handleToggle}
      >
        <div className={cn(
          "flex items-center w-full transition-all duration-300 ease-in-out",
          isCollapsedRoot ? "" : "py-1.5 px-2" // Slightly taller in collapsed to accommodate the card
        )}>
            {/* Indentation */}
            <div style={{ width: `${depth * 20}px` }} className="shrink-0 transition-all duration-300" />
            
            {/* Arrow - Always outside the dark box for consistent "Retract" animation */}
            {(isRoot && enableRootCollapseCard) ?<></> : <div className="shrink-0 flex items-center justify-center w-4 h-4 mr-2">
                {hasChildren && (
                    <ChevronRight
                    className={cn(
                        "w-3.5 h-3.5 transition-transform duration-300",
                        expanded ? "rotate-90" : ""
                    )}
                    style={{ color: darkestColor }}
                    />
                )}
            </div>}

            {/* The Morphing Dark Box */}
            {/* In Expanded: It acts as the Badge (small, dark). */}
            {/* In Collapsed Root: It acts as the Card (full width, dark). */}
            {isRoot && enableRootCollapseCard ? (
                <div className="flex-1 flex items-center min-w-0">
                    <div 
                        className={cn(
                            "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-md flex items-center overflow-hidden",
                            isCollapsedRoot ? "flex-1 py-3 px-4" : "flex-none py-1 px-3",
                            isCollapsedRoot ? rootCollapseCardClassName : ""
                        )}
                        style={{
                            backgroundColor: darkerColor
                        }}
                    >
                         {/* Inner Content of the Dark Box */}
                         {isCollapsedRoot ? (
                             <div className="w-full animate-in fade-in duration-300 text-white">
                                {node.collapsedContent}
                             </div>
                         ) : (
                             <div className="text-white font-medium whitespace-nowrap animate-in fade-in duration-300">
                                {node.content_title}
                             </div>
                         )}
                    </div>

                    {/* Outer Content (Visible only when expanded) */}
                    <div className={cn(
                        "transition-all duration-500 overflow-hidden ml-2 flex-1",
                        isCollapsedRoot ? "w-0 flex-none opacity-0 ml-0" : "opacity-100"
                    )}>
                        {!isCollapsedRoot && node.content}
                    </div>
                </div>
            ) : (
                // Standard Rendering for non-root / non-special nodes
                <div className="flex-1 flex items-center min-w-0">
                     <div className="flex items-center">
                        <Badge style={{background: darkerColor}} className="text-white mr-2">
                        {node.content_title}
                        </Badge>
                     </div>
                     <div className="flex-1 min-w-0">
                        {node.content}
                     </div>
                </div>
            )}
        </div>
      </div>

      {/* Recursive Children */}
      {hasChildren && (
        <div 
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden flex flex-col w-full">
            {node.children!.map((child, index) => (
              <TreeNode 
                key={child.id} 
                node={child} 
                depth={depth + 1}
                index={index + 1}
                isLast={index === node.children!.length - 1}
                enableRootCollapseCard={enableRootCollapseCard}
                rootCollapseCardClassName={rootCollapseCardClassName}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export function TreeTable({ data, className, enableRootCollapseCard = false, rootCollapseCardClassName }: TreeTableProps) {
  return (
    <div className={cn(
        "w-full flex flex-col rounded-md border overflow-hidden", 
        className
    )}>
      {data.map((node, index) => (
        <TreeNode 
          key={node.id} 
          index={index}
          node={node} 
          isLast={index === data.length - 1}
          enableRootCollapseCard={enableRootCollapseCard}
          rootCollapseCardClassName={rootCollapseCardClassName}
        />
      ))}
    </div>
  );
}
