'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import {
  dismissCTA,
  markWorkspaceCreated,
  trackSession,
  getCTAState,
} from '@/shared/utils/workspace-cta-storage';
import { toast } from 'sonner';

export function useWorkspaceCTA() {
  const { profile, switchOrg } = useAuthContext();
  const [showModal, setShowModal] = useState(false);

  // Track session on mount (no auto-popup, just metrics)
  useEffect(() => {
    if (!profile) return;

    // Track session for engagement metrics
    trackSession(profile.id);
  }, [profile]);

  // Handle dismissal
  const handleDismiss = useCallback(() => {
    if (!profile) return;

    dismissCTA(profile.id);
    setShowModal(false);

    // Show friendly message based on dismiss count
    const state = getCTAState(profile.id);
    if (state && state.dismissCount >= 2) {
      toast.info('Ok! Não vamos mais perguntar por enquanto.');
    }
  }, [profile]);

  // Handle workspace created
  const handleWorkspaceCreated = useCallback(
    async (orgId: string) => {
      if (!profile) return;

      // Mark as created in localStorage
      markWorkspaceCreated(profile.id);

      // Switch to new workspace (does hard reload internally)
      try {
        await switchOrg(orgId);
        
        // Note: code below won't execute - switchOrg does window.location.href
        toast.success('Bem-vindo ao seu workspace!', {
          description: 'Você agora é proprietário e pode gerenciar tudo.',
        });
      } catch (e) {
        toast.error('Erro ao trocar de workspace');
        console.error('Switch org error:', e);
      }
    },
    [profile, switchOrg]
  );

  // Manual trigger (for card button)
  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  // Check if should show card (MEMBER only)
  const shouldShowCard = profile?.currentRole === 'MEMBER';

  return {
    showModal,
    setShowModal,
    handleDismiss,
    handleWorkspaceCreated,
    openModal,
    shouldShowCard,
    profile,
  };
}
