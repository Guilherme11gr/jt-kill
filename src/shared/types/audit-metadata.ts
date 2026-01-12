/**
 * Audit Metadata Types
 * 
 * Estrutura rica para rastreabilidade de ações no sistema.
 * O backend preenche a maioria automaticamente.
 */

/**
 * Metadata base que o BACKEND preenche automaticamente
 */
export interface BaseAuditMetadata {
  // Origem da ação
  source: 'human' | 'agent' | 'system';
  
  // Contexto de agente (preenchido automaticamente se source === 'agent')
  agentName?: string;           // 'Gepeto'
  
  // Contexto da operação
  triggerSource?: string;       // 'kanban-drag', 'bulk-update', 'api-patch'
  bulkOperation?: boolean;      // true se for operação em lote
  
  // Contexto de negócio (preenchido do banco)
  taskTitle?: string;
  localId?: number;
  projectKey?: string;
}

/**
 * Metadata que o AGENTE pode enviar opcionalmente
 */
export interface AgentProvidedMetadata {
  changeReason?: string;        // "Sprint planning - priorizando bugs críticos"
  aiReasoning?: string;         // "PR #123 foi mergeado, movendo para DONE"
  relatedTaskIds?: string[];    // IDs de tasks relacionadas
}

/**
 * Metadata completa de mudança de status
 */
export interface StatusChangeMetadata extends BaseAuditMetadata, AgentProvidedMetadata {
  fromStatus: string;
  toStatus: string;
}

/**
 * Metadata completa de mudança de assignee
 */
export interface AssigneeChangeMetadata extends BaseAuditMetadata, AgentProvidedMetadata {
  fromAssigneeId: string | null;
  toAssigneeId: string | null;
  assigneeName?: string;
}

/**
 * Metadata completa de bloqueio
 */
export interface BlockedChangeMetadata extends BaseAuditMetadata, AgentProvidedMetadata {
  blocked: boolean;
}

/**
 * Union type para todas as metadatas de audit
 */
export type AuditMetadata = 
  | StatusChangeMetadata 
  | AssigneeChangeMetadata 
  | BlockedChangeMetadata
  | (BaseAuditMetadata & AgentProvidedMetadata & Record<string, unknown>);
