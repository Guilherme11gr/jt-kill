'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Github, ExternalLink, Unplug, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || 'fluxo-dev';

interface GitHubIntegrationCardProps {
  projectId: string;
  orgId: string;
  githubInstallationId: number | null;
  githubRepoFullName: string | null;
  githubRepoUrl: string | null;
  onUpdate: () => void;
}

export function GitHubIntegrationCard({
  projectId,
  orgId,
  githubInstallationId,
  githubRepoFullName,
  githubRepoUrl,
  onUpdate,
}: GitHubIntegrationCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isConnected = Boolean(githubInstallationId);
  const isGitHubAppConfigured = Boolean(process.env.NEXT_PUBLIC_GITHUB_APP_ID);

  // Reset isConnecting if navigation fails or user comes back
  useEffect(() => {
    setIsConnecting(false);
  }, []);

  const handleConnect = useCallback(async () => {
    if (!isGitHubAppConfigured) {
      toast.error('GitHub App not configured');
      return;
    }

    setIsConnecting(true);

    try {
      // Generate HMAC-signed state server-side
      const res = await fetch('/api/github/install/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, orgId }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate install state');
      }

      const { state } = await res.json();
      window.location.href = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new?state=${state}`;
    } catch {
      setIsConnecting(false);
      toast.error('Failed to initiate GitHub connection');
    }
  }, [projectId, orgId, isGitHubAppConfigured]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to disconnect');
      }
      toast.success('GitHub disconnected');
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  }, [projectId, onUpdate]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          <CardTitle className="text-lg">GitHub</CardTitle>
        </div>
        <CardDescription>
          Link tasks to GitHub issues and PRs. Use <code className="text-xs bg-muted px-1 rounded">Fixes KEY-123</code> in commits to auto-close.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline-success" className="gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Connected
                </Badge>
                {githubRepoFullName && (
                  <a
                    href={githubRepoUrl || `https://github.com/${githubRepoFullName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {githubRepoFullName}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-destructive hover:text-destructive"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unplug className="w-4 h-4 mr-1" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Connect a GitHub repository to enable issue & PR linking.
            </p>
            <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Github className="w-4 h-4" />
              )}
              Connect GitHub
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
