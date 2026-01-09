import OpenAI from 'openai';
import type { ChatCompletionInput, ChatCompletionResult, AIMessage } from './types';
import { 
    AI_MODEL_CHAT, 
    AI_MODEL_REASONER, 
    AI_TEMPERATURE_CREATIVE 
} from '@/config/ai.config';

/**
 * AI Adapter
 * Encapsulates AI operations using OpenAI SDK with DeepSeek API
 */
export class AIAdapter {
    constructor(private client: OpenAI) { }

    /**
     * Generate a chat completion using DeepSeek via OpenAI SDK
     */
    async chatCompletion(input: ChatCompletionInput): Promise<ChatCompletionResult> {
        const response = await this.client.chat.completions.create({
            model: input.model ?? AI_MODEL_CHAT,
            messages: input.messages,
            temperature: input.temperature ?? AI_TEMPERATURE_CREATIVE,
            max_tokens: input.maxTokens,
            stream: false,
        });

        const choice = response.choices[0];

        return {
            content: choice.message.content ?? '',
            role: choice.message.role as ChatCompletionResult['role'],
            finishReason: choice.finish_reason,
            usage: response.usage ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
            } : undefined,
        };
    }

    /**
     * Generate streaming chat completion
     * Returns an async generator that yields content chunks
     */
    async *chatCompletionStream(input: ChatCompletionInput): AsyncGenerator<string> {
        const stream = await this.client.chat.completions.create({
            model: input.model ?? AI_MODEL_CHAT,
            messages: input.messages,
            temperature: input.temperature ?? AI_TEMPERATURE_CREATIVE,
            max_tokens: input.maxTokens,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }

    /**
     * FASE 2 do Two-Stage Pipeline
     * 
     * Uses DeepSeek Reasoner (R1) for deep reasoning tasks
     * More expensive but produces higher quality structured outputs
     * 
     * Best for: generating specs, complex descriptions, strategic planning
     */
    async reasonerCompletion(input: {
        objective: string;
        context: string;
        systemPrompt: string;
        temperature?: number;
        maxTokens?: number;
    }): Promise<ChatCompletionResult> {
        const userPrompt = `${input.context}

---

Objetivo: ${input.objective}`;

        const response = await this.client.chat.completions.create({
            model: AI_MODEL_REASONER,
            messages: [
                { role: 'system', content: input.systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: input.temperature ?? AI_TEMPERATURE_CREATIVE,
            max_tokens: input.maxTokens ?? 2000,
            stream: false,
        });

        const choice = response.choices[0];

        return {
            content: choice.message.content ?? '',
            role: choice.message.role as ChatCompletionResult['role'],
            finishReason: choice.finish_reason,
            usage: response.usage ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
            } : undefined,
        };
    }

    /**
     * Simple helper to generate a single response from a prompt
     */
    async generateText(
        prompt: string,
        options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
    ): Promise<string> {
        const messages: AIMessage[] = [];

        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        const result = await this.chatCompletion({
            messages,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });

        return result.content;
    }
}
