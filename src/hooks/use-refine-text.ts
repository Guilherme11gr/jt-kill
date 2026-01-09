import { useState } from 'react';
import { toast } from 'sonner';

interface RefineTextInput {
    text: string;
    context?: string;
}

interface RefineTextResponse {
    refinedText: string;
    originalLength: number;
    refinedLength: number;
}

/**
 * Hook to refine text using AI
 * 
 * Simple hook that improves writing quality without adding new information.
 * 
 * @example
 * ```tsx
 * const { refineText, isRefining } = useRefineText();
 * 
 * const handleRefine = async () => {
 *   const result = await refineText({
 *     text: description,
 *     context: 'descrição de task'
 *   });
 *   if (result) {
 *     setDescription(result.refinedText);
 *   }
 * };
 * ```
 */
export function useRefineText() {
    const [isRefining, setIsRefining] = useState(false);

    const refineText = async (
        input: RefineTextInput
    ): Promise<RefineTextResponse | null> => {
        if (!input.text.trim()) {
            toast.error('Texto vazio', {
                description: 'Adicione um texto antes de refinar',
            });
            return null;
        }

        setIsRefining(true);

        try {
            const response = await fetch('/api/ai/refine-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Erro ao refinar texto');
            }

            const result = await response.json();

            toast.success('Texto refinado', {
                description: `${result.data.originalLength} → ${result.data.refinedLength} caracteres`,
            });

            return result.data;

        } catch (error) {
            console.error('[useRefineText] Error:', error);
            toast.error('Erro ao refinar', {
                description: error instanceof Error ? error.message : 'Erro desconhecido',
            });
            return null;
        } finally {
            setIsRefining(false);
        }
    };

    return {
        refineText,
        isRefining,
    };
}
