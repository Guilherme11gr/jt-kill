var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/core/tokens.ts
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
function estimateMessagesTokens(messages) {
  return messages.reduce((total, msg) => {
    const content = typeof msg.content === "string" ? msg.content : "";
    const toolCalls = msg.tool_calls ? JSON.stringify(msg.tool_calls) : "";
    const toolCallId = msg.tool_call_id || "";
    return total + estimateTokens(content + toolCalls + toolCallId) + 4;
  }, 0);
}
function truncateHistory(messages, maxTokens, options = {}) {
  const { preserveLastN = 4 } = options;
  if (messages.length <= preserveLastN) {
    return messages;
  }
  const lastMessages = messages.slice(-preserveLastN);
  const olderMessages = messages.slice(0, -preserveLastN);
  let tokens = estimateMessagesTokens(lastMessages);
  const kept = [...lastMessages];
  for (let i = olderMessages.length - 1; i >= 0; i--) {
    const msgTokens = estimateMessagesTokens([olderMessages[i]]);
    if (tokens + msgTokens > maxTokens) break;
    kept.unshift(olderMessages[i]);
    tokens += msgTokens;
  }
  console.log(`[AgentSDK] Context window: ${tokens}/${maxTokens} tokens, ${kept.length}/${messages.length} messages`);
  return kept;
}
async function summarizeHistory(messages, llmCall) {
  if (messages.length === 0) return "";
  const prompt = `Summarize this conversation in 2-3 sentences, keeping key information:
${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
  return llmCall(prompt);
}
function createSummaryMessage(summary) {
  return {
    role: "user",
    content: `[Previous conversation summary: ${summary}]`
  };
}

export {
  __require,
  estimateTokens,
  estimateMessagesTokens,
  truncateHistory,
  summarizeHistory,
  createSummaryMessage
};
//# sourceMappingURL=chunk-GKUNIXJR.js.map