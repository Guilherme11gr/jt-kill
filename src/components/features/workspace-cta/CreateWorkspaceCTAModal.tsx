'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Rocket, Sparkles, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

export interface CreateWorkspaceCTAModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkspaceCreated: (orgId: string) => void;
}

type Step = 1 | 2 | 3;

export function CreateWorkspaceCTAModal({
  open,
  onOpenChange,
  onWorkspaceCreated,
}: CreateWorkspaceCTAModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdWorkspace, setCreatedWorkspace] = useState<{
    orgId: string;
    orgName: string;
    orgSlug: string;
  } | null>(null);

  const handleClose = () => {
    // Reset state
    setStep(1);
    setWorkspaceName('');
    setError(null);
    setCreatedWorkspace(null);
    onOpenChange(false);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/workspaces/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao criar workspace');
      }

      setCreatedWorkspace(data.data.workspace);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToWorkspace = () => {
    if (createdWorkspace) {
      onWorkspaceCreated(createdWorkspace.orgId);
      handleClose();
    }
  };

  const handleStayHere = () => {
    handleClose();
  };

  // Auto-generate slug preview
  const slugPreview = workspaceName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'seu-workspace';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Step 1: Motivation */}
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center text-2xl">
                Pronto para criar seu workspace?
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Você já conhece o produto! Que tal criar seu próprio espaço para gerenciar seus projetos e convidar sua equipe?
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <p className="text-sm">Gerencie seus próprios projetos</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <p className="text-sm">Convide sua equipe</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <p className="text-sm">Controle total como proprietário</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Talvez depois
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1">
                  Começar agora
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Create Form */}
        {step === 2 && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center text-2xl">
                Crie seu workspace
              </DialogTitle>
              <DialogDescription className="text-center">
                Escolha um nome para começar
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Nome do workspace</Label>
                <Input
                  id="workspace-name"
                  placeholder="Ex: Minha Empresa"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  URL: <span className="font-mono">{slugPreview}</span>
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleCreate} disabled={loading || !workspaceName.trim()} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar workspace
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && createdWorkspace && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-center text-2xl">
                Workspace criado!
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Você agora é proprietário de <span className="font-semibold">{createdWorkspace.orgName}</span>.
                Convide sua equipe e comece a gerenciar projetos.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-3">
              <Button onClick={handleGoToWorkspace} className="w-full" size="lg">
                Ir para meu workspace
              </Button>
              <Button variant="outline" onClick={handleStayHere} className="w-full">
                Ficar no workspace atual
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
