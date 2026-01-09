'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { TagInfo } from '@/shared/types/tag.types';

interface TagBadgeProps {
  tag: TagInfo;
  size?: 'sm' | 'md';
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

/**
 * Display a tag badge with its color
 */
export function TagBadge({
  tag,
  size = 'sm',
  onClick,
  onRemove,
  className,
}: TagBadgeProps) {
  // Calculate contrasting text color based on background
  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const textColor = getContrastColor(tag.color);
  const bgColor = tag.color;

  return (
    <Badge
      variant="outline"
      onClick={onClick}
      className={cn(
        'border-0 font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:opacity-70"
          aria-label={`Remover tag ${tag.name}`}
        >
          ×
        </button>
      )}
    </Badge>
  );
}
