"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Textarea } from "@/components/ui/textarea";
import { AIImproveButton } from "@/components/ui/ai-improve-button";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  id?: string;
  /** Handlers opcionais para AI - se fornecidos, botões aparecem automaticamente */
  onImprove?: () => void | Promise<void>;
  onGenerate?: () => void | Promise<void>;
  isImproving?: boolean;
  isGenerating?: boolean;
  /** Desabilita botão Melhorar se não houver conteúdo */
  disableImproveWhenEmpty?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Escreva em Markdown...",
  minHeight = "200px",
  id,
  onImprove,
  onGenerate,
  isImproving = false,
  isGenerating = false,
  disableImproveWhenEmpty = true,
}: MarkdownEditorProps) {
  // Inicializa como edição apenas se estiver vazio
  const [isEditing, setIsEditing] = useState(!value?.trim());
  const [localValue, setLocalValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValue(value);
    // Se o valor externo mudar e for vazio, pode querer editar. 
    // Mas se mudar pra algo com conteudo, talvez manter o estado atual ou ir pra preview?
    // Vamos respeitar apenas state update, não forçar mode change exceto na montagem.
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleBlur = () => {
    if (localValue.trim()) {
      setIsEditing(false);
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  return (
    <div className="space-y-2 group" ref={containerRef}>
      <div className="flex gap-2 items-center justify-between">
        {/* AI Buttons (se handlers fornecidos) */}
        {(onImprove || onGenerate) && (
          <div className="flex gap-2">
            {onImprove && (
              <AIImproveButton
                onClick={onImprove}
                isLoading={isImproving}
                disabled={disableImproveWhenEmpty && !localValue.trim()}
                label="Melhorar"
                title="Melhorar descrição existente (gramática, markdown, clareza)"
                size="sm"
              />
            )}
            {onGenerate && (
              <AIImproveButton
                onClick={onGenerate}
                isLoading={isGenerating}
                label="Gerar"
                title="Gerar descrição completa com IA (considera conteúdo atual se houver)"
                variant="outline"
                size="sm"
              />
            )}
          </div>
        )}
        
        {/* Mode Toggle */}
        <div className="flex gap-2 text-xs opacity-50 group-hover:opacity-100 transition-opacity ml-auto">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors font-medium border border-transparent",
              isEditing
                ? "bg-primary/10 text-primary border-primary/20"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors font-medium border border-transparent",
              !isEditing
                ? "bg-primary/10 text-primary border-primary/20"
                : "hover:bg-muted text-muted-foreground"
            )}
            disabled={!localValue.trim()}
          >
            Preview
          </button>
        </div>
      </div>

      {isEditing ? (
        <Textarea
          id={id}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={{ minHeight }}
          className="font-mono text-sm resize-y leading-relaxed"
          autoFocus // Foca automaticamente quando entra no modo edição
        />
      ) : (
        <div
          onClick={handleFocus}
          className="rounded-md border border-transparent hover:border-border/50 bg-transparent hover:bg-muted/10 p-4 cursor-text transition-all overflow-auto max-h-[60vh]"
          style={{ minHeight }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b tracking-tight" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-6 mb-3 tracking-tight" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
              p: ({ node, ...props }) => <p className="leading-7 mb-4 [&:not(:first-child)]:mt-4" {...props} />,
              ul: ({ node, ...props }) => <ul className="my-4 ml-6 list-disc [&>li]:mt-2" {...props} />,
              ol: ({ node, ...props }) => <ol className="my-4 ml-6 list-decimal [&>li]:mt-2" {...props} />,
              li: ({ node, ...props }) => <li className="leading-7" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="mt-4 border-l-4 border-primary/30 pl-4 py-1 italic bg-muted/30 rounded-r text-muted-foreground" {...props} />,
              code: (props: any) => {
                const { children, className, node, ...rest } = props
                const match = /language-(\w+)/.exec(className || '')
                const isInline = !match && !props.className?.includes('language-') && !String(children).includes('\n');

                return isInline ? (
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground" {...rest}>
                    {children}
                  </code>
                ) : (
                  <div className="mt-4 mb-4 overflow-x-auto rounded-lg bg-muted p-4 py-3">
                    <code className={cn("relative font-mono text-sm leading-relaxed", className)}>
                      {children}
                    </code>
                  </div>
                )
              },
              pre: ({ node, ref, ...props }: any) => <div {...props} />, // Wrapper handled by code component
              a: ({ node, ...props }) => <a className="font-medium text-primary underline underline-offset-4 hover:no-underline" {...props} />,
              hr: ({ node, ...props }) => <hr className="my-6 border-border" {...props} />,
              table: ({ node, ...props }) => <div className="my-6 w-full overflow-x-auto"><table className="w-full" {...props} /></div>,
              th: ({ node, ...props }) => <th className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
              td: ({ node, ...props }) => <td className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
            }}
          >
            {localValue}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
