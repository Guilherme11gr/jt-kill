import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ChevronDown, StopCircle, BrainCircuit } from "lucide-react";
import { MarkdownViewer } from "@/components/ui/markdown-viewer";
import { cn } from "@/lib/utils";
import { useFeatureStreaming } from "@/lib/hooks/use-feature-streaming";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FeatureAISummaryCardProps {
  featureId: string;
  // Initial summary not supported yet as we don't store it in Feature model, 
  // but the component is ready for it if we add the field later.
  initialSummary?: string | null;
  lastAnalyzedAt?: Date | string | null;
}

export function FeatureAISummaryCard({
  featureId,
  initialSummary,
  lastAnalyzedAt
}: FeatureAISummaryCardProps) {
  const { summary, isStreaming, isLoading, generateSummary, stopGeneration, fetchLatestSummary } = useFeatureStreaming();
  const [localSummary, setLocalSummary] = useState<string | null>(initialSummary || null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch latest on mount if not provided
  useEffect(() => {
    if (!initialSummary && featureId) {
      fetchLatestSummary(featureId);
    }
  }, [featureId, initialSummary, fetchLatestSummary]);

  // Sync stream to local display
  const hasAutoExpandedRef = useRef(false);

  // Reset auto-expand ref when generation starts (loading becomes true)
  useEffect(() => {
    if (isLoading) {
      hasAutoExpandedRef.current = false;
    }
  }, [isLoading]);

  // Sync stream to local display
  useEffect(() => {
    if (summary) {
      setLocalSummary(summary);
      // Auto expand only once per stream session
      if (!isExpanded && !hasAutoExpandedRef.current) {
        setIsExpanded(true);
        hasAutoExpandedRef.current = true;
      }
    }
  }, [summary, isExpanded]);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await generateSummary(featureId, true);
  };

  const hasContent = !!localSummary;

  // Compact State (Not generated yet)
  if (!hasContent && !isStreaming && !isLoading) {
    return (
      <div className="mb-6 rounded-lg border border-dashed border-violet-200 bg-violet-50/30 dark:bg-violet-900/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-full text-violet-600">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-violet-900 dark:text-violet-100">
              Resumo de Feature com IA
            </h3>
            <p className="text-xs text-violet-600/80 dark:text-violet-300/80">
              Obtenha uma análise técnica profunda das tasks e progresso.
            </p>
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          size="sm"
          variant="outline"
          className="h-8 border-violet-200 hover:bg-violet-100 text-violet-700 dark:border-violet-800 dark:hover:bg-violet-900/50 dark:text-violet-300"
        >
          <Sparkles className="w-3.5 h-3.5 mr-2" />
          Analisar
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6 group relative rounded-lg border bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-900/50 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-transparent hover:bg-accent/5 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm text-foreground/80">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                !isExpanded && "-rotate-90"
              )}
            />
          </Button>
          <BrainCircuit className="w-4 h-4 text-violet-500" />
          <span className="font-medium">Análise Técnica</span>
          {isStreaming && (
            <span className="text-xs text-violet-500 animate-pulse font-medium">
              • Gerando pensamentos...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isStreaming ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); stopGeneration(); }}
              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <StopCircle className="w-3.5 h-3.5 mr-1" />
              Parar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Regenerar análise"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-5 border-t border-neutral-100 dark:border-neutral-800/50 animate-in fade-in slide-in-from-top-1 duration-200">
          {isLoading || (!localSummary && isStreaming) ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-muted/60 rounded w-3/4" />
              <div className="h-4 bg-muted/60 rounded w-1/2" />
              <div className="h-20 bg-muted/30 rounded w-full mt-2" />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none 
                            prose-headings:font-semibold prose-headings:text-foreground/90 
                            prose-p:leading-relaxed prose-p:text-muted-foreground
                            prose-strong:text-foreground
                            prose-blockquote:border-violet-300 prose-blockquote:bg-violet-50/50 dark:prose-blockquote:bg-violet-900/20 dark:prose-blockquote:border-violet-700 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-sm prose-blockquote:not-italic prose-blockquote:text-violet-700 dark:prose-blockquote:text-violet-300">
              <MarkdownViewer value={localSummary || ""} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
