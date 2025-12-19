"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  id?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Escreva em Markdown...",
  minHeight = "200px",
  id,
}: MarkdownEditorProps) {
  const [isEditing, setIsEditing] = useState(true);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    onChange(localValue);
    if (localValue.trim()) {
      setIsEditing(false);
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={cn(
            "px-3 py-1.5 rounded-md transition-colors",
            isEditing
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className={cn(
            "px-3 py-1.5 rounded-md transition-colors",
            !isEditing
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Preview
        </button>
      </div>

      {isEditing ? (
        <Textarea
          id={id}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={{ minHeight }}
          className="font-mono text-sm resize-y"
        />
      ) : (
        <div
          onClick={handleFocus}
          className={cn(
            "rounded-md border border-input bg-muted/30 p-4 cursor-text prose prose-invert prose-sm max-w-none",
            "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground",
            "prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
            "prose-pre:bg-muted prose-pre:text-foreground",
            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
            "prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground",
            "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
          )}
          style={{ minHeight }}
        >
          {localValue.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {localValue}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">
              Clique para editar...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
