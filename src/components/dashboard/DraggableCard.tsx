'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDashboardLayout } from '@/contexts/DashboardLayoutContext';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface DraggableCardProps {
  id: string;
  span: number;
  children: React.ReactNode;
}

export function DraggableCard({ id, span, children }: DraggableCardProps) {
  const { isEditMode } = useDashboardLayout();
  // Ensure SSR/client parity: use a deterministic drag handle id
  // dnd-kit uses the id prop for all attributes, so as long as id is stable, hydration will match
  // If you ever need a unique id for aria-describedby, use a hash of id or a static prefix
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Grid span classes mapping
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-2', 
    3: 'col-span-3',
    4: 'col-span-4 lg:col-span-4',
    6: 'col-span-12 lg:col-span-6',
    8: 'col-span-12 lg:col-span-8',
    12: 'col-span-12'
  };

  const spanClass = spanClasses[span as keyof typeof spanClasses] || 'col-span-12';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        spanClass,
        'relative group',
        isDragging && 'z-50 opacity-50',
        isEditMode && 'cursor-grab active:cursor-grabbing'
      )}
      {...attributes}
    >
      {/* Drag Handle - Only visible in edit mode */}
      {isEditMode && (
        <div
          {...listeners}
          className={cn(
            'absolute top-2 right-2 z-10 p-1 rounded bg-white/90 border shadow-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
            'flex items-center justify-center'
          )}
          title="Arrastrar para reordenar"
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </div>
      )}
      
      {/* Card Content with overlay in edit mode */}
      <div 
        className={cn(
          'relative',
          isEditMode && 'pointer-events-auto',
          isEditMode && 'after:absolute after:inset-0 after:bg-blue-500/5 after:border-2 after:border-dashed after:border-blue-300/50 after:rounded-lg after:opacity-0 group-hover:after:opacity-100 after:transition-opacity'
        )}
      >
        {children}
      </div>
    </div>
  );
}