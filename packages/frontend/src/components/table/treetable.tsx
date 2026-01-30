"use client"

import { useState, useMemo } from "react";
import { ChevronRight, Plus, GripVertical } from "lucide-react";
import { darken, lighten } from "colorizr";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  onAdd?: () => void;
  addPopoverContent?: React.ReactNode;
  addPopoverOpen?: boolean;
  onAddPopoverOpenChange?: (open: boolean) => void;
  onReorder?: (newOrder: (string | number)[]) => void;
}

export interface TreeTableProps {
  data: TreeTableNode[];
  className?: string;
  enableRootCollapseCard?: boolean;
  rootCollapseCardClassName?: string;
  enableReorder?: boolean;
  onReorder?: (parentId: string | number | null, newOrder: (string | number)[]) => void;
}

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableTreeNode = ({
  node,
  depth = 0,
  index,
  enableRootCollapseCard = false,
  rootCollapseCardClassName,
  enableReorder = false,
  onReorder,
}: {
  node: TreeTableNode;
  depth?: number;
  isLast?: boolean;
  index: number;
  enableRootCollapseCard?: boolean;
  rootCollapseCardClassName?: string;
  enableReorder?: boolean;
  onReorder?: (parentId: string | number | null, newOrder: (string | number)[]) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: !enableReorder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TreeNode
        node={node}
        depth={depth}
        index={index}
        enableRootCollapseCard={enableRootCollapseCard}
        rootCollapseCardClassName={rootCollapseCardClassName}
        enableReorder={enableReorder}
        dragHandleProps={enableReorder ? { ...attributes, ...listeners } : undefined}
        onReorder={onReorder}
      />
    </div>
  );
};

const TreeNode = ({
  node,
  depth = 0,
  index,
  enableRootCollapseCard = false,
  rootCollapseCardClassName,
  enableReorder = false,
  dragHandleProps,
  onReorder,
}: {
  node: TreeTableNode;
  depth?: number;
  isLast?: boolean;
  index: number;
  enableRootCollapseCard?: boolean;
  rootCollapseCardClassName?: string;
  enableReorder?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onReorder?: (parentId: string | number | null, newOrder: (string | number)[]) => void;
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
            
            {/* Drag Handle */}
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                className="shrink-0 mr-1 cursor-grab active:cursor-grabbing p-1 hover:bg-black/5 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}

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
                     {node.content_title && <div className="flex items-center">
                        <Badge style={{background: darkerColor}} className="text-white mr-2">
                        {node.content_title}
                        </Badge>
                     </div>
                     }
                     <div className="flex-1 min-w-0">
                        {node.content}
                     </div>
                     {node.onAdd && (
                        node.addPopoverContent ? (
                          <Popover open={node.addPopoverOpen} onOpenChange={node.onAddPopoverOpenChange}>
                            <PopoverTrigger asChild>
                              <div
                                className="shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  node.onAdd?.();
                                }}
                              >
                                <Plus className="w-4 h-4" style={{ color: darkestColor }} />
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-90 p-3" align="start" onClick={(e) => e.stopPropagation()}>
                              {node.addPopoverContent}
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div
                            className="shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              node.onAdd?.();
                            }}
                          >
                            <Plus className="w-4 h-4" style={{ color: darkestColor }} />
                          </div>
                        )
                     )}
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
            <SortableTreeList
              data={node.children!}
              depth={depth + 1}
              parentId={node.id}
              enableRootCollapseCard={enableRootCollapseCard}
              rootCollapseCardClassName={rootCollapseCardClassName}
              enableReorder={enableReorder}
              onReorder={onReorder}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const SortableTreeList = ({
  data,
  depth = 0,
  parentId = null,
  enableRootCollapseCard = false,
  rootCollapseCardClassName,
  enableReorder = false,
  onReorder,
}: {
  data: TreeTableNode[];
  depth?: number;
  parentId?: string | number | null;
  enableRootCollapseCard?: boolean;
  rootCollapseCardClassName?: string;
  enableReorder?: boolean;
  onReorder?: (parentId: string | number | null, newOrder: (string | number)[]) => void;
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = data.findIndex((item) => item.id === active.id);
      const newIndex = data.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(data, oldIndex, newIndex).map(item => item.id);
      onReorder?.(parentId, newOrder);
    }
  };

  const ids = useMemo(() => data.map(item => item.id), [data]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {data.map((node, index) => (
          <SortableTreeNode
            key={node.id}
            node={node}
            depth={depth}
            index={index}
            isLast={index === data.length - 1}
            enableRootCollapseCard={enableRootCollapseCard}
            rootCollapseCardClassName={rootCollapseCardClassName}
            enableReorder={enableReorder}
            onReorder={onReorder}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export function TreeTable({ data, className, enableRootCollapseCard = false, rootCollapseCardClassName, enableReorder = false, onReorder }: TreeTableProps) {
  return (
    <div className={cn(
        "w-full flex flex-col rounded-md border overflow-hidden",
        className
    )}>
      <SortableTreeList
        data={data}
        enableRootCollapseCard={enableRootCollapseCard}
        rootCollapseCardClassName={rootCollapseCardClassName}
        enableReorder={enableReorder}
        onReorder={onReorder}
      />
    </div>
  );
}
