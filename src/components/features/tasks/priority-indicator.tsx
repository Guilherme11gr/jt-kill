'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import type { TaskPriority } from '@/shared/types';

const PRIORITY_CONFIG: Record<TaskPriority, {
  icon: typeof AlertCircle;
  color: string;
  label: string;
}> = {
  CRITICAL: {
    icon: AlertCircle,
    color: 'text-red-500',
    label: 'Crítico',
  },
  HIGH: {
    icon: ArrowUp,
    color: 'text-orange-500',
    label: 'Alto',
  },
  MEDIUM: {
    icon: Minus,
    color: 'text-blue-400',
    label: 'Médio',
  },
  LOW: {
    icon: ArrowDown,
    color: 'text-muted-foreground',
    label: 'Baixo',
  },
};

interface PriorityIndicatorProps {
  priority: TaskPriority;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function PriorityIndicator({
  priority,
  showLabel = false,
  size = 'sm',
  className,
}: PriorityIndicatorProps) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Icon
        className={cn(
          iconSize,
          config.color,
          priority === 'CRITICAL' && 'animate-pulse'
        )}
      />
      {showLabel && (
        <span className={cn('text-xs', config.color)}>{config.label}</span>
      )}
    </div>
  );
}
