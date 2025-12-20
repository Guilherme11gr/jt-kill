'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserAvatar } from './user-avatar';
import { useUsers, type User } from '@/lib/query/hooks/use-users';
import { Loader2, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssigneeSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Reusable assignee selection dropdown
 * Fetches users from API and displays with avatars
 * 
 * @example
 * <AssigneeSelect 
 *   value={assigneeId} 
 *   onChange={(id) => setAssigneeId(id)} 
 * />
 */
export function AssigneeSelect({
  value,
  onChange,
  className,
  placeholder = 'Sem responsável',
  disabled = false,
}: AssigneeSelectProps) {
  const { data: users = [], isLoading } = useUsers();

  const selectedUser = users.find((u: User) => u.id === value);

  return (
    <Select
      value={value || '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? null : v)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger
        className={cn(
          'w-full transition-all duration-200',
          !value && "text-muted-foreground border-dashed bg-muted/20 hover:bg-muted/40",
          value && "bg-background border-solid font-medium",
          className
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 animate-pulse">
            <div className="size-5 rounded-full bg-muted-foreground/20" />
            <span className="text-muted-foreground text-xs">Carregando...</span>
          </div>
        ) : (
          <SelectValue>
            {selectedUser ? (
              <div className="flex items-center gap-2 group">
                <UserAvatar
                  displayName={selectedUser.displayName}
                  avatarUrl={selectedUser.avatarUrl}
                  userId={selectedUser.id}
                  size="sm"
                  showTooltip={false}
                  className="size-5 ring-1 ring-border group-hover:ring-primary/30 transition-all"
                />
                <span className="truncate text-sm">{selectedUser.displayName || 'Usuário'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground/80 group-hover:text-foreground transition-colors">
                <UserCircle className="size-4 opacity-70" />
                <span className="text-sm">{placeholder}</span>
              </div>
            )}
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent className="z-popover">
        <SelectItem value="__none__">
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserCircle className="size-4" />
            <span>Sem responsável</span>
          </div>
        </SelectItem>
        {users.map((user: User) => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-2">
              <UserAvatar
                userId={user.id}
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
                size="sm"
                showTooltip={false}
              />
              <span>{user.displayName || 'Usuário'}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

