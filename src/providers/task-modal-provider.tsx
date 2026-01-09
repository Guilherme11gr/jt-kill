'use client';

import { createContext, useContext, useState, useCallback, useMemo, Suspense } from 'react';
import { TaskDetailModal } from '@/components/features/tasks/task-detail-modal';
import type { TaskWithReadableId } from '@/shared/types';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface TaskModalContextValue {
  /** Abre a modal com uma task */
  openTask: (task: TaskWithReadableId) => void;
  /** Abre a modal buscando task por ID */
  openTaskById: (taskId: string) => void;
  /** Fecha a modal */
  closeTask: () => void;
  /** Task atualmente aberta */
  currentTask: TaskWithReadableId | null;
  /** Se a modal está aberta */
  isOpen: boolean;
}

const TaskModalContext = createContext<TaskModalContextValue | undefined>(undefined);

export function useTaskModal() {
  const context = useContext(TaskModalContext);
  if (!context) {
    throw new Error('useTaskModal must be used within TaskModalProvider');
  }
  return context;
}

interface TaskModalProviderProps {
  children: React.ReactNode;
}

/**
 * TaskModalProviderInner - Componente interno que usa useSearchParams
 */
function TaskModalProviderInner({ children }: TaskModalProviderProps) {
  const [currentTask, setCurrentTask] = useState<TaskWithReadableId | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Abre modal com task já carregada
  const openTask = useCallback((task: TaskWithReadableId) => {
    setCurrentTask(task);
    setIsOpen(true);
    
    // Atualiza URL sem navegar
    const params = new URLSearchParams(searchParams.toString());
    params.set('task', task.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Abre modal por ID (precisa buscar task)
  const openTaskById = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (response.ok) {
        const { data } = await response.json();
        setCurrentTask(data);
        setIsOpen(true);
        
        const params = new URLSearchParams(searchParams.toString());
        params.set('task', taskId);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    }
  }, [pathname, router, searchParams]);

  // Fecha modal e limpa URL
  const closeTask = useCallback(() => {
    setIsOpen(false);
    setCurrentTask(null);
    
    // Remove task da URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('task');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  // Handler para editar (navega para página de edição)
  const handleEdit = useCallback((task: TaskWithReadableId) => {
    router.push(`/tasks/${task.id}/edit`);
  }, [router]);

  // Handler para deletar (placeholder - pode implementar depois)
  const handleDelete = useCallback((task: TaskWithReadableId) => {
    // TODO: Implementar delete com confirmação
    console.log('Delete task:', task.id);
  }, []);

  const value = useMemo(() => ({
    openTask,
    openTaskById,
    closeTask,
    currentTask,
    isOpen,
  }), [openTask, openTaskById, closeTask, currentTask, isOpen]);

  return (
    <TaskModalContext.Provider value={value}>
      {children}
      
      {/* Modal global - renderizada uma vez, controlada pelo context */}
      <TaskDetailModal
        task={currentTask}
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeTask();
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </TaskModalContext.Provider>
  );
}

/**
 * TaskModalProvider - Provider global para modal de task
 * 
 * Permite abrir a modal de detalhes de task de qualquer lugar do app.
 * Sincroniza com URL via query param ?task=uuid
 * 
 * Wrapped em Suspense para suportar useSearchParams no Next.js 14+
 */
export function TaskModalProvider({ children }: TaskModalProviderProps) {
  return (
    <Suspense fallback={children}>
      <TaskModalProviderInner>{children}</TaskModalProviderInner>
    </Suspense>
  );
}
