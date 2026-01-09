"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, History, User, UserPlus, UserMinus, Shield, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const actionLabels: Record<string, { label: string; icon: typeof User; color: string }> = {
  'user.joined': { label: 'Entrou na organização', icon: UserPlus, color: 'text-green-500' },
  'user.left': { label: 'Saiu da organização', icon: UserMinus, color: 'text-orange-500' },
  'user.removed': { label: 'Foi removido', icon: UserMinus, color: 'text-red-500' },
  'user.role.changed': { label: 'Papel alterado', icon: Shield, color: 'text-blue-500' },
  'invite.created': { label: 'Convite criado', icon: UserPlus, color: 'text-purple-500' },
  'invite.revoked': { label: 'Convite revogado', icon: UserMinus, color: 'text-orange-500' },
  'invite.accepted': { label: 'Convite aceito', icon: UserPlus, color: 'text-green-500' },
};

export default function AuditLogsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');

  const isOwner = profile?.currentRole === 'OWNER';

  useEffect(() => {
    if (!authLoading && isOwner) {
      fetchLogs();
    }
  }, [authLoading, isOwner, actionFilter]);

  const fetchLogs = async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: String(offset),
      });

      if (actionFilter !== 'all') {
        params.set('action', actionFilter);
      }

      const response = await fetch(`/api/audit-logs?${params}`);

      if (response.ok) {
        const data = await response.json();
        if (offset === 0) {
          setLogs(data.data.logs);
        } else {
          setLogs(prev => [...prev, ...data.data.logs]);
        }
        setPagination(data.data.pagination);
      } else {
        toast.error('Erro ao carregar logs');
      }
    } catch (error) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (pagination?.hasMore) {
      fetchLogs(pagination.offset + pagination.limit);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas o proprietário da organização pode visualizar os logs de auditoria.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-muted-foreground">Histórico de ações na organização</p>
        </div>
        <Button variant="outline" onClick={() => fetchLogs(0)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="user.joined">Usuário entrou</SelectItem>
                  <SelectItem value="user.left">Usuário saiu</SelectItem>
                  <SelectItem value="user.removed">Usuário removido</SelectItem>
                  <SelectItem value="user.role.changed">Papel alterado</SelectItem>
                  <SelectItem value="invite.created">Convite criado</SelectItem>
                  <SelectItem value="invite.revoked">Convite revogado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {pagination && (
              <p className="text-sm text-muted-foreground">
                {pagination.total} registros
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum log encontrado
            </p>
          ) : (
            <>
              {logs.map((log) => {
                const actionInfo = actionLabels[log.action] || {
                  label: log.action,
                  icon: History,
                  color: 'text-muted-foreground',
                };
                const ActionIcon = actionInfo.icon;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className={`mt-0.5 ${actionInfo.color}`}>
                      <ActionIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{actionInfo.label}</p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {pagination?.hasMore && (
                <div className="pt-4 text-center">
                  <Button variant="outline" onClick={loadMore} disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Carregar mais
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
