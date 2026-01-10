'use client';

import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

export interface CreateWorkspaceCardProps {
  onCreateClick: () => void;
}

export function CreateWorkspaceCard({ onCreateClick }: CreateWorkspaceCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Rocket className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Crie seu workspace</p>
          <p className="text-xs text-muted-foreground">
            Gerencie seus próprios projetos como proprietário
          </p>
        </div>
      </div>
      <Button onClick={onCreateClick} size="sm" className="shrink-0">
        Começar
      </Button>
    </div>
  );
}
