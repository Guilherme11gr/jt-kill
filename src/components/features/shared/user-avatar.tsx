'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
};

function getInitials(name?: string | null, userId?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (userId) {
    return userId.slice(0, 2).toUpperCase();
  }
  return '??';
}

/**
 * Reusable user avatar with optional tooltip
 * 
 * @example
 * <UserAvatar 
 *   displayName="João Silva" 
 *   avatarUrl="/avatars/joao.jpg" 
 *   size="md" 
 *   showTooltip 
 * />
 */
export function UserAvatar({
  userId,
  displayName,
  avatarUrl,
  size = 'md',
  showTooltip = true,
  className,
}: UserAvatarProps) {
  const initials = getInitials(displayName, userId);
  const name = displayName || 'Usuário';

  // Deterministic color based on userId or name
  const getColorClass = (id: string | null | undefined) => {
    if (!id) return 'bg-muted text-muted-foreground';
    const colors = [
      'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
      'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
      'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
      'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
      'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    ];
    let hash = 0;
    const str = id;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const colorClass = getColorClass(userId || displayName);

  const avatar = (
    <Avatar
      className={cn(
        sizeClasses[size],
        "ring-2 ring-transparent transition-all duration-200 group-hover:ring-primary/10",
        className
      )}
    >
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} className="object-cover" />}
      <AvatarFallback className={cn("font-medium text-[0.6rem] sm:text-xs transition-colors", colorClass)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!showTooltip) {
    return avatar;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {avatar}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
