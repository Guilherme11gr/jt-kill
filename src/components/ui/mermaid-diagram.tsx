"use client";

import { useEffect, useRef, useId, useCallback } from "react";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";

/**
 * Resolve CSS custom property to hex color at runtime.
 * Mermaid's color parser doesn't understand hsl(var(...)) syntax.
 */
function resolveCssColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!value) return fallback;
    // Convert to hex via temporary element
    const el = document.createElement("div");
    el.style.color = value;
    document.body.appendChild(el);
    const computed = getComputedStyle(el).color;
    document.body.removeChild(el);
    // computed is "rgb(r, g, b)" -- convert to hex
    const match = computed.match(/(\d+)/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/** Initialize mermaid once with resolved theme colors */
let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaidInitialized = true;

  const primary = resolveCssColor("--primary", "#6d28d9");
  const foreground = resolveCssColor("--foreground", "#0a0a0a");
  const muted = resolveCssColor("--muted", "#f5f5f5");
  const border = resolveCssColor("--border", "#e5e5e5");

  // Derive lighter/darker variants
  const primaryBg = primary + "22"; // ~13% opacity via hex alpha
  const primaryBorder = primary + "66"; // ~40% opacity

  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "strict",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    themeVariables: {
      fontSize: "14px",
      primaryColor: primaryBg,
      primaryTextColor: foreground,
      primaryBorderColor: primaryBorder,
      lineColor: border,
      secondaryColor: muted,
      tertiaryColor: muted,
      noteBkgColor: muted,
      noteTextColor: foreground,
      textColor: foreground,
    },
  });
}

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, "m");
  const errorRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || errorRef.current) return;

    const render = async () => {
      try {
        initMermaid();
        const { svg } = await mermaid.render(`mermaid-${uniqueId}`, chart.trim());
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("height");
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
          }
        }
      } catch {
        errorRef.current = true;
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Erro ao renderizar diagrama Mermaid</span>
            </div>
          `;
        }
      }
    };

    render();
  }, [chart, uniqueId]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "my-4 flex justify-center overflow-x-auto rounded-lg border bg-background p-6",
        className
      )}
    />
  );
}
