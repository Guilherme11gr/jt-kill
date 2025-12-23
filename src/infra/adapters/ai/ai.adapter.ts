import OpenAI from 'openai';
import type { ChatCompletionInput, ChatCompletionResult, AIMessage } from './types';

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
            model: input.model ?? 'deepseek-chat',
            messages: input.messages,
            temperature: input.temperature ?? 0.7,
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
            model: input.model ?? 'deepseek-chat',
            messages: input.messages,
            temperature: input.temperature ?? 0.7,
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
