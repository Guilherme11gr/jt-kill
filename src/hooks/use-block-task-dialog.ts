import { useState, useCallback, useEffect } from 'react';
import { useBlockTask } from './use-block-task';
import type { Task } from '@/shared/types/task.types';

interface UseBlockTaskDialogOptions {
  onSuccess?: (blocked: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook centralizado para lógica de bloqueio de tasks com modal
 * 
 * Elimina duplicação entre TaskCard e TaskDetailModal
 * Gerencia estado do dialog + chamadas ao useBlockTask
 * 
 * @example
 * const blockDialog = useBlockTaskDialog(task);
 * 
 * return (
 *   <>
 *     <Checkbox 
 *       checked={task.blocked} 
 *       onCheckedChange={blockDialog.handleBlockedChange} 
 *     />
 *     <BlockTaskDialog {...blockDialog} taskTitle={task.title} />
 *   </>
 * );
 */
export function useBlockTaskDialog(task: Task, options?: UseBlockTaskDialogOptions) {
  const [showDialog, setShowDialog] = useState(false);
  const { toggleBlocked, isPending } = useBlockTask(task.id, options);

  /**
   * Handler para checkbox de bloqueio
   * Abre modal se bloqueando, executa direto se desbloqueando
   */
  const handleBlockedChange = useCallback((checked: boolean) => {
    if (checked) {
      // Bloquear: abre modal para capturar motivo
      setShowDialog(true);
    } else {
      // Desbloquear: executa direto sem modal
      toggleBlocked(false);
    }
  }, [toggleBlocked]);

  /**
   * Handler para confirmação do modal
   * Aguarda mutation completar antes de fechar (evita race condition)
   */
  const handleConfirmBlock = useCallback(async (reason: string) => {
    try {
      await toggleBlocked(true, reason);
      setShowDialog(false); // só fecha após sucesso
    } catch (error) {
      // Dialog permanece aberto em caso de erro
      console.error('[useBlockTaskDialog] Erro ao bloquear task:', error);
    }
  }, [toggleBlocked]);

  /**
   * Handler para cancelamento do modal
   */
  const handleCancelBlock = useCallback(() => {
    setShowDialog(false);
  }, []);

  return {
    // Estado
    showDialog,
    setShowDialog,
    isPending,
    
    // Handlers
    handleBlockedChange,
    handleConfirmBlock,
    handleCancelBlock,
    
    // Props para BlockTaskDialog
    open: showDialog,
    onOpenChange: setShowDialog,
    onConfirm: handleConfirmBlock,
    onCancel: handleCancelBlock,
  };
}
