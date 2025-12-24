"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Copy, Check, AlertCircle } from "lucide-react";
import { MarkdownViewer } from "@/components/ui/markdown-viewer";
import { toast } from "sonner";
import { useGenerateEpicSummary, useUpdateEpic } from "@/lib/query";

interface EpicSummaryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    epicId: string;
    currentDescription?: string;
    onSuccess?: () => void;
}

export function EpicSummaryModal({
    open,
    onOpenChange,
    epicId,
    currentDescription,
    onSuccess
}: EpicSummaryModalProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [hasCopied, setHasCopied] = useState(false);

    // Hooks
    const generateSummaryMutation = useGenerateEpicSummary();
    const updateEpicMutation = useUpdateEpic();

    const isLoading = generateSummaryMutation.isPending;
    const isSaving = updateEpicMutation.isPending;

    // Handlers
    const handleGenerate = async () => {
        try {
            const result = await generateSummaryMutation.mutateAsync({ epicId });
            setSummary(result.summary);
        } catch {
            // Error handled by query hook toast usually, but we can double check
        }
    };

    const handleApply = async () => {
        if (!summary) return;
        try {
            await updateEpicMutation.mutateAsync({
                id: epicId,
                data: { description: summary }
            });
            toast.success("Resumo aplicado com sucesso!");
            onOpenChange(false);
            onSuccess?.();
        } catch {
            toast.error("Erro ao salvar resumo.");
        }
    };

    const handleCopy = () => {
        if (!summary) return;
        navigator.clipboard.writeText(summary);
        setHasCopied(true);
        toast.success("Copiado para a área de transferência");
        setTimeout(() => setHasCopied(false), 2000);
    };

    const reset = () => {
        setSummary(null);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) reset();
            onOpenChange(val);
        }}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        Resumo Executivo com IA
                    </DialogTitle>
                    <DialogDescription>
                        Gere um resumo estratégico do Épico com base nas features e no contexto do projeto.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-[300px] border rounded-md p-4 bg-muted/30 relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background/50 backdrop-blur-sm z-10 transition-all">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                            <p className="text-sm font-medium animate-pulse">Analisando features e contexto...</p>
                        </div>
                    ) : !summary ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 py-12 text-center">
                            <div className="p-4 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-600">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <div className="max-w-sm space-y-2">
                                <h3 className="font-semibold text-lg">Pronto para gerar</h3>
                                <p className="text-sm text-muted-foreground">
                                    A IA analisará o título do épico, descrição do projeto e lista de features para criar um resumo formatado.
                                </p>
                            </div>
                            <Button onClick={handleGenerate} size="lg" className="mt-2 text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 border-0 shadow-lg shadow-violet-500/20 transition-all">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Gerar Resumo Agora
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <MarkdownViewer value={summary} />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {!summary ? (
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    ) : (
                        <>
                            <div className="flex-1 flex gap-2">
                                <Button variant="outline" onClick={handleCopy} title="Copiar markdown">
                                    {hasCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                    {hasCopied ? "Copiado" : "Copiar"}
                                </Button>
                                <Button variant="outline" onClick={handleGenerate} disabled={isLoading}>
                                    Tentar Novamente
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
                                <Button onClick={handleApply} disabled={isSaving}>
                                    {isSaving ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                                    ) : (
                                        "Aplicar na Descrição"
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
