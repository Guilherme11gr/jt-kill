"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Zap, Users } from "lucide-react";

interface InviteInfo {
  orgName: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

const roleLabels = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

function SignupContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const inviteToken = searchParams.get("invite");
  const isInviteFlow = !!inviteToken;

  // Fetch invite info if token present
  useEffect(() => {
    if (inviteToken) {
      setLoadingInvite(true);
      fetch(`/api/invites/${inviteToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setInviteInfo({
              orgName: data.data.orgName,
              role: data.data.role,
            });
          }
        })
        .catch(() => { })
        .finally(() => setLoadingInvite(false));
    }
  }, [inviteToken]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
            // Only include org_name if NOT an invite flow
            ...(isInviteFlow ? {} : { org_name: orgName }),
            // Store invite token to use in callback
            invite_token: inviteToken || undefined,
          },
          emailRedirectTo: isInviteFlow
            ? `${window.location.origin}/auth/callback?invite=${inviteToken}`
            : `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        toast.error("Erro ao criar conta: " + authError.message);
        return;
      }

      if (authData.user && !authData.session) {
        // Email confirmation required
        toast.success("Conta criada! Verifique seu email para confirmar.");
        router.push("/login?message=check-email");
      } else if (authData.session) {
        // Auto-confirmed - if invite, accept it
        if (inviteToken) {
          const acceptRes = await fetch('/api/invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteToken }),
          });

          if (acceptRes.ok) {
            toast.success("Bem-vindo à organização!");
          } else {
            toast.error("Conta criada, mas erro ao aceitar convite.");
          }
        } else {
          toast.success("Conta criada com sucesso!");
        }
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error("Erro inesperado ao criar conta");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            {isInviteFlow ? (
              <Users className="w-6 h-6 text-primary-foreground" />
            ) : (
              <Zap className="w-6 h-6 text-primary-foreground" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isInviteFlow ? "Criar Conta" : "Criar Conta"}
          </CardTitle>
          <CardDescription>
            {isInviteFlow && inviteInfo ? (
              <>Você foi convidado para <strong>{inviteInfo.orgName}</strong></>
            ) : (
              "Comece a usar o Jira Killer gratuitamente"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show invite info if present */}
          {isInviteFlow && inviteInfo && (
            <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Organização:</span>
                <span className="font-medium">{inviteInfo.orgName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sua função:</span>
                <Badge variant="secondary">{roleLabels[inviteInfo.role]}</Badge>
              </div>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seu Nome</label>
              <Input
                type="text"
                placeholder="João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Only show org name field if NOT invite flow */}
            {!isInviteFlow && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Organização</label>
                <Input
                  type="text"
                  placeholder="Minha Empresa"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isInviteFlow ? "Criar Conta e Entrar" : "Criar Conta"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              href={isInviteFlow ? `/login?redirect=/invite/${inviteToken}` : "/login"}
              className="text-primary hover:underline"
            >
              Entrar
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
