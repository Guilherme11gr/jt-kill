'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Copy, KeyRound, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';

interface AgentKeyState {
  hasKey: boolean;
  keyPrefix: string | null;
  createdAt: string | null;
  rotatedAt: string | null;
  lastUsedAt: string | null;
  lastUsedAgentName: string | null;
}

interface AgentKeyMutationState extends AgentKeyState {
  token?: string;
  wasRotated?: boolean;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Nunca';
  }

  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AgentAccessCard() {
  const [data, setData] = useState<AgentKeyState | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmRotateOpen, setConfirmRotateOpen] = useState(false);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/agent-key', {
        cache: 'no-store',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || 'Erro ao carregar chave');
      }

      setData(payload.data as AgentKeyState);
    } catch (error) {
      toast.error('Erro ao carregar acesso para agents', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  const handleGenerate = useCallback(async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/settings/agent-key', {
        method: 'POST',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || 'Erro ao gerar chave');
      }

      const next = payload.data as AgentKeyMutationState;
      setData({
        hasKey: next.hasKey,
        keyPrefix: next.keyPrefix,
        createdAt: next.createdAt,
        rotatedAt: next.rotatedAt,
        lastUsedAt: next.lastUsedAt,
        lastUsedAgentName: next.lastUsedAgentName,
      });
      setRevealedToken(next.token || null);
      setConfirmRotateOpen(false);

      toast.success(next.wasRotated ? 'Chave regenerada com sucesso' : 'Chave gerada com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar chave', {
        description: error instanceof Error ? error.message : 'Erro inesperado',
      });
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!revealedToken) {
      return;
    }

    await navigator.clipboard.writeText(revealedToken);
    toast.success('Chave copiada para a área de transferência');
  }, [revealedToken]);

  const statusLabel = useMemo(() => {
    if (!data?.hasKey) {
      return 'Sem chave';
    }

    return 'Ativa';
  }, [data?.hasKey]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Acesso para Agents
            </CardTitle>
            <CardDescription>
              Gere a chave do tenant para usar a Agent API e o MCP com auditoria por workspace.
            </CardDescription>
          </div>
          <Badge variant={data?.hasKey ? 'default' : 'secondary'}>
            {statusLabel}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando acesso do tenant...
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Prefixo</p>
                  <p className="mt-1 font-mono text-sm">
                    {data?.keyPrefix ? `agk_••••${data.keyPrefix}` : 'Nenhuma chave ativa'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Último agent</p>
                  <p className="mt-1 text-sm">{data?.lastUsedAgentName || 'Ainda não utilizado'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Criada em</p>
                  <p className="mt-1 text-sm">{formatDate(data?.createdAt || null)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Último uso</p>
                  <p className="mt-1 text-sm">{formatDate(data?.lastUsedAt || null)}</p>
                </div>
                <div className="rounded-lg border p-3 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Última rotação</p>
                  <p className="mt-1 text-sm">{formatDate(data?.rotatedAt || null)}</p>
                </div>
              </div>

              {revealedToken && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="mb-2 flex items-start gap-2 text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Mostramos a chave completa apenas uma vez.</p>
                      <p className="text-xs text-muted-foreground">
                        Guarde este valor no seu agent agora. Depois disso, só o prefixo continuará visível.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md bg-background p-3 font-mono text-xs break-all">
                    {revealedToken}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar chave
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => (data?.hasKey ? setConfirmRotateOpen(true) : void handleGenerate())} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  {data?.hasKey ? 'Regenerar chave' : 'Gerar chave'}
                </Button>
                <Button variant="outline" onClick={() => void fetchState()} disabled={loading || submitting}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar status
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmRotateOpen} onOpenChange={setConfirmRotateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar chave do tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave atual será invalidada imediatamente. Todos os agents e integrações que usam a chave antiga vão parar até você atualizar o token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={submitting} onClick={(event) => {
              event.preventDefault();
              void handleGenerate();
            }}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Regenerar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
