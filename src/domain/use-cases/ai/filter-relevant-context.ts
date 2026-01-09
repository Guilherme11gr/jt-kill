import type { AIAdapter } from '@/infra/adapters/ai';
import { stripMarkdown, truncateToTokens } from '@/shared/utils/markdown-cleaner';
import {
    AI_MAX_DOCS_TO_INCLUDE,
    AI_MAX_TOKENS_PER_DOC,
    AI_MAX_TOKENS_FEATURE_CONTEXT,
    AI_MODEL_CHAT,
    AI_TEMPERATURE_PRECISE,
    AI_MAX_TOKENS_TRIAGE,
} from '@/config/ai.config';

export interface FilterContextInput {
    objective: string; // "Melhorar descrição da task X"
    allDocs?: Array<{ title: string; content: string }>;
    featureContext?: string | null;
    maxDocsToInclude?: number; // Default from config
}

export interface FilterContextOutput {
    relevantDocs: Array<{ title: string; content: string }>;
    cleanedContext: string;
    tokensEstimate: number;
}

export interface FilterContextDeps {
    aiAdapter: AIAdapter;
}

/**
 * FASE 1 do Two-Stage Pipeline
 * 
 * Usa DeepSeek Chat (rápido/barato) para:
 * 1. Filtrar docs mais relevantes
 * 2. Limpar markdown → texto puro
 * 3. Reduzir tokens para o Reasoner
 * 
 * Economia estimada: 50-70% tokens
 */
export async function filterRelevantContext(
    input: FilterContextInput,
    deps: FilterContextDeps
): Promise<FilterContextOutput> {
    const { aiAdapter } = deps;
    const { 
        objective, 
        allDocs = [], 
        featureContext, 
        maxDocsToInclude = AI_MAX_DOCS_TO_INCLUDE 
    } = input;

    // Se não tem docs, retorna contexto limpo direto
    if (allDocs.length === 0) {
        const cleanedFeature = featureContext ? stripMarkdown(featureContext) : '';
        return {
            relevantDocs: [],
            cleanedContext: cleanedFeature,
            tokensEstimate: Math.ceil(cleanedFeature.length / 4),
        };
    }

    // 1. Criar prompt de triagem
    const triagePrompt = buildTriagePrompt(objective, allDocs, featureContext);

    // 2. Chamar DeepSeek Chat para filtrar (rápido)
    const result = await aiAdapter.chatCompletion({
        model: AI_MODEL_CHAT,
        messages: [
            {
                role: 'system',
                content: 'Você é um filtro inteligente de documentação. Sua tarefa é identificar quais documentos são REALMENTE relevantes para um objetivo específico. Seja criterioso: menos é mais.',
            },
            {
                role: 'user',
                content: triagePrompt,
            },
        ],
        temperature: AI_TEMPERATURE_PRECISE,
        maxTokens: AI_MAX_TOKENS_TRIAGE,
    });

    // 3. Parsear resposta (índices dos docs relevantes)
    const relevantIndices = parseTriageResponse(result.content, allDocs.length);

    // 4. Filtrar e limpar docs
    const relevantDocs = relevantIndices
        .slice(0, maxDocsToInclude)
        .map(idx => allDocs[idx])
        .filter(Boolean);

    // 5. Limpar markdown de tudo
    const cleanedDocs = relevantDocs.map(doc => ({
        title: doc.title,
        content: stripMarkdown(doc.content),
    }));

    const cleanedFeature = featureContext ? stripMarkdown(featureContext) : '';

    // 6. Montar contexto final limpo
    const contextParts = [];
    
    if (cleanedFeature) {
        contextParts.push(`Contexto da Feature:\n${truncateToTokens(cleanedFeature, AI_MAX_TOKENS_FEATURE_CONTEXT)}`);
    }

    if (cleanedDocs.length > 0) {
        contextParts.push(
            `Documentação Relevante:\n${cleanedDocs.map(doc => 
                `[${doc.title}]\n${truncateToTokens(doc.content, AI_MAX_TOKENS_PER_DOC)}`
            ).join('\n\n')}`
        );
    }

    const cleanedContext = contextParts.join('\n\n---\n\n');

    return {
        relevantDocs: cleanedDocs,
        cleanedContext,
        tokensEstimate: Math.ceil(cleanedContext.length / 4),
    };
}

function buildTriagePrompt(
    objective: string,
    docs: Array<{ title: string; content: string }>,
    featureContext?: string | null
): string {
    const docsList = docs
        .map((doc, idx) => `[${idx}] ${doc.title}\n${doc.content.slice(0, 200)}...`)
        .join('\n\n');

    return `**Objetivo:** ${objective}

${featureContext ? `**Contexto da Feature:**\n${featureContext.slice(0, 300)}...\n\n` : ''}**Documentos Disponíveis:**
${docsList}

---

Analise os documentos acima e identifique APENAS os que são REALMENTE relevantes para o objetivo.
Seja criterioso: documentação irrelevante polui o contexto e piora o resultado.

Responda APENAS com os números dos documentos relevantes, separados por vírgula.
Exemplo: 0,2,5

Se NENHUM for relevante, responda: NONE`;
}

function parseTriageResponse(response: string, maxIndex: number): number[] {
    const trimmed = response.trim().toUpperCase();

    if (trimmed === 'NONE') return [];

    // Extrair números da resposta
    const numbers = trimmed
        .split(/[,\s]+/)
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n) && n >= 0 && n < maxIndex);

    return numbers;
}
