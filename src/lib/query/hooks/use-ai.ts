import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

interface ImproveDescriptionInput {
    taskId: string;
}

interface GenerateDescriptionInput {
    title: string;
    featureId: string;
    currentDescription?: string;
    type?: 'TASK' | 'BUG';
    priority?: string;
}

interface AIDescriptionResponse {
    description: string;
    taskId?: string;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook para melhorar descrição de task existente
 * Usa o contexto da task e feature para gerar descrição melhorada
 */
export function useImproveDescription() {
    return useMutation({
        mutationFn: async (input: ImproveDescriptionInput): Promise<AIDescriptionResponse> => {
            const response = await fetch('/api/ai/improve-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error?.error?.message || 'Erro ao melhorar descrição');
            }

            const json = await response.json();
            return json.data as AIDescriptionResponse;
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Hook para gerar descrição para nova task (sem taskId)
 * Usa contexto inline passado pelo frontend
 */
export function useGenerateDescription() {
    return useMutation({
        mutationFn: async (input: GenerateDescriptionInput): Promise<AIDescriptionResponse> => {
            const response = await fetch('/api/ai/generate-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error?.error?.message || 'Erro ao gerar descrição');
            }

            const json = await response.json();
            return json.data as AIDescriptionResponse;
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
