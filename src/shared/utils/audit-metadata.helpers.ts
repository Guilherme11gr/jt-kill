/**
 * Audit Metadata Helpers
 * 
 * Helpers para construir metadata de audit automaticamente.
 */

import type { 
  BaseAuditMetadata, 
  AgentProvidedMetadata,
  AuditMetadata 
} from '@/shared/types/audit-metadata';

interface TaskContext {
  title: string;
  localId: number;
  projectKey?: string;
}

interface AgentContext {
  agentName: string;
}

/**
 * Constrói metadata base para ações de HUMANOS
 */
export function buildHumanMetadata(
  task: TaskContext,
  triggerSource?: string
): BaseAuditMetadata {
  return {
    source: 'human',
    triggerSource: triggerSource || 'web',
    taskTitle: task.title,
    localId: task.localId,
    projectKey: task.projectKey,
  };
}

/**
 * Constrói metadata base para ações de AGENTES
 */
export function buildAgentMetadata(
  task: TaskContext,
  agent: AgentContext,
  options?: {
    triggerSource?: string;
    bulkOperation?: boolean;
    provided?: AgentProvidedMetadata;
  }
): BaseAuditMetadata & AgentProvidedMetadata {
  return {
    source: 'agent',
    agentName: agent.agentName,
    triggerSource: options?.triggerSource || 'api',
    bulkOperation: options?.bulkOperation,
    taskTitle: task.title,
    localId: task.localId,
    projectKey: task.projectKey,
    // Merge com metadata fornecida pelo agente
    ...(options?.provided && {
      changeReason: options.provided.changeReason,
      aiReasoning: options.provided.aiReasoning,
      relatedTaskIds: options.provided.relatedTaskIds,
    }),
  };
}

/**
 * Merge metadata base com dados específicos da mudança
 */
export function mergeAuditMetadata<T extends Record<string, unknown>>(
  base: BaseAuditMetadata & AgentProvidedMetadata,
  specific: T
): AuditMetadata {
  return {
    ...base,
    ...specific,
  };
}
