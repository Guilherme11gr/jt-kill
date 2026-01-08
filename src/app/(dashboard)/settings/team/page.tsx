"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Users, UserPlus, Crown, Shield, User, Copy, Trash2, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { InviteDialog } from "@/components/features/settings/invite-dialog";
import { TransferOwnershipDialog } from "@/components/features/settings/transfer-ownership-dialog";

interface TeamMember {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

interface PendingInvite {
  id: string;
  url: string;
  email: string | null;
  role: 'ADMIN' | 'MEMBER';
  expiresAt: string;
  createdAt: string;
}

const roleLabels = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

const roleIcons = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
};

const roleBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  OWNER: 'default',
  ADMIN: 'secondary',
  MEMBER: 'outline',
};

export default function TeamSettingsPage() {
  const { profile, isLoading: authLoading, refreshProfile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const canManageTeam = profile?.role === 'OWNER' || profile?.role === 'ADMIN';
  const canChangeRoles = profile?.role === 'OWNER';
  const isOwner = profile?.role === 'OWNER';

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/users'),
        canManageTeam ? fetch('/api/invites') : Promise.resolve(null),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.data);
      }

      if (invitesRes?.ok) {
        const data = await invitesRes.json();
        setInvites(data.data);
      }
    } catch (error) {
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'MEMBER') => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast.success('Papel alterado com sucesso');
        fetchTeamData();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || 'Erro ao alterar papel');
      }
    } catch (error) {
      toast.error('Erro ao alterar papel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedMember.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Membro removido');
        fetchTeamData();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || 'Erro ao remover membro');
      }
    } catch (error) {
      toast.error('Erro ao remover membro');
    } finally {
      setActionLoading(false);
      setRemoveDialogOpen(false);
      setSelectedMember(null);
    }
  };

  const handleRevokeInvite = async (token: string) => {
    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Convite revogado');
        fetchTeamData();
      } else {
        const data = await response.json();
        toast.error(data.error?.message || 'Erro ao revogar convite');
      }
    } catch (error) {
      toast.error('Erro ao revogar convite');
    }
  };

  const copyInviteLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">Gerencie os membros da sua organização</p>
        </div>
        {canManageTeam && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar
          </Button>
        )}
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Membros ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role];
            const isCurrentUser = member.id === profile?.id;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>
                      {member.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.displayName || 'Usuário'}
                      {isCurrentUser && (
                        <span className="text-muted-foreground ml-2">(você)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={roleBadgeVariants[member.role]}>
                    <RoleIcon className="w-3 h-3 mr-1" />
                    {roleLabels[member.role]}
                  </Badge>

                  {canManageTeam && !isCurrentUser && member.role !== 'OWNER' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canChangeRoles && (
                          <>
                            {member.role === 'MEMBER' && (
                              <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'ADMIN')}>
                                <Shield className="w-4 h-4 mr-2" />
                                Promover a Admin
                              </DropdownMenuItem>
                            )}
                            {member.role === 'ADMIN' && (
                              <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'MEMBER')}>
                                <User className="w-4 h-4 mr-2" />
                                Rebaixar a Membro
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedMember(member);
                            setRemoveDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {canManageTeam && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites Pendentes ({invites.length})</CardTitle>
            <CardDescription>Links de convite ativos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div>
                  <p className="font-medium">
                    {invite.email || 'Link público'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expira em {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{roleLabels[invite.role]}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyInviteLink(invite.url)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // Extract token from URL (last segment)
                      const token = invite.url.split('/').pop();
                      if (token) handleRevokeInvite(token);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Transfer Ownership Section - Only for OWNER */}
      {isOwner && members.length > 1 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <ArrowRightLeft className="w-5 h-5" />
              Transferir Propriedade
            </CardTitle>
            <CardDescription>
              Transfira a propriedade da organização para outro membro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(true)}
              className="border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferir Propriedade
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchTeamData}
      />

      {/* Transfer Ownership Dialog */}
      <TransferOwnershipDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        members={members}
        currentUserId={profile?.id || ''}
        onSuccess={() => {
          fetchTeamData();
          refreshProfile();
        }}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>{selectedMember?.displayName}</strong> da organização?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
