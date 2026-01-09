/**
 * Markdown Cleaner Utilities
 * Converts markdown to clean plain text for AI consumption
 */

/**
 * Remove markdown formatting and convert to plain text
 * Keeps structure but removes syntax bloat
 */
export function stripMarkdown(text: string): string {
    let cleaned = text;

    // Remove code blocks (keep content)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
    });

    // Remove inline code (keep content)
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

    // Remove headers (keep text, add structure)
    cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1:');

    // Remove bold/italic (keep text)
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

    // Remove links (keep text)
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove images
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

    // Convert lists to simple bullets
    cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '- ');
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '- ');

    // Remove horizontal rules
    cleaned = cleaned.replace(/^---+$/gm, '');
    cleaned = cleaned.replace(/^\*\*\*+$/gm, '');

    // Remove blockquotes
    cleaned = cleaned.replace(/^>\s+/gm, '');

    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Truncate text to approximate token count
 * Rough estimate: 1 token ≈ 4 characters
 */
export function truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;

    return text.slice(0, maxChars) + '...';
}
