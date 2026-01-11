import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface UseFeatureStreamingReturn {
  summary: string;
  isLoading: boolean;
  isStreaming: boolean;
  generateSummary: (featureId: string, force?: boolean) => Promise<void>;
  stopGeneration: () => void;
  fetchLatestSummary: (featureId: string) => Promise<void>;
}

export function useFeatureStreaming(): UseFeatureStreamingReturn {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const generateSummary = useCallback(async (featureId: string, force: boolean = false) => {
    try {
      setSummary('');
      setIsLoading(true);
      setIsStreaming(true);

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/ai/generate-feature-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureId, forceRegenerate: force }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      setIsLoading(false); // Initial load done, now streaming

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setSummary((prev) => prev + chunk);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Geração interrompida.');
      } else {
        console.error('Streaming error:', error);
        toast.error('Erro ao gerar resumo.');
      }
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const fetchLatestSummary = useCallback(async (featureId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/generate-feature-summary?featureId=${featureId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useState(() => {
    // This runs only once on mount/unmount equivalent
    // actually useEffect is better for cleanup
  });

  // Ensure abort on unmount
  useEffect(() => {
    return () => {
      stopGeneration();
    };
  }, [stopGeneration]);

  return {
    summary,
    isLoading,
    isStreaming,
    generateSummary,
    stopGeneration,
    fetchLatestSummary
  };
}
