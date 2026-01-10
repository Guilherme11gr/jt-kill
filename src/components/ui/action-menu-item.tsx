'use client';

import { Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

export interface ActionMenuItemProps extends Omit<React.ComponentProps<typeof DropdownMenuPrimitive.Item>, 'onSelect' | 'children'> {
  variant?: 'edit' | 'delete' | 'default';
  onAction?: () => void;
  children?: React.ReactNode;
}

const ICONS: Record<string, typeof Pencil | typeof Trash2 | null> = {
  edit: Pencil,
  delete: Trash2,
  default: null,
};

export function ActionMenuItem({
  variant = 'default',
  onAction,
  children,
  className,
  ...props
}: ActionMenuItemProps) {
  const Icon = ICONS[variant];
  const isDestructive = variant === 'delete';

  return (
    <DropdownMenuItem
      onSelect={onAction}
      className={isDestructive ? 'text-destructive focus:text-destructive' : className}
      {...props}
    >
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {children || (variant === 'edit' && 'Editar') || (variant === 'delete' && 'Excluir')}
    </DropdownMenuItem>
  );
}
