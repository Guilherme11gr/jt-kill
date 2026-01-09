import type { Task, TaskStatus } from '@/shared/types';
import type { TaskRepository, AuditLogRepository } from '@/infra/adapters/prisma';
import { NotFoundError } from '@/shared/errors';
import { AUDIT_ACTIONS } from '@/infra/adapters/prisma/audit-log.repository';

export interface UpdateTaskStatusDeps {
  taskRepository: TaskRepository;
  auditLogRepository: AuditLogRepository;
}

/**
 * Update Task Status Use Case
 * 
 * Agora valida usuário e registra auditoria
 */
export async function updateTaskStatus(
  id: string,
  orgId: string,
  newStatus: TaskStatus,
  userId: string,
  deps: UpdateTaskStatusDeps
): Promise<Task> {
  const { taskRepository, auditLogRepository } = deps;

  const task = await taskRepository.findById(id, orgId);
  if (!task) {
    throw new NotFoundError('Task', id);
  }

  const previousStatus = task.status;
  const updatedTask = await taskRepository.updateStatus(id, orgId, newStatus);

  // Audit log
  if (previousStatus !== newStatus) {
    await auditLogRepository.log({
      orgId,
      userId,
      action: AUDIT_ACTIONS.TASK_STATUS_CHANGED,
      targetType: 'task',
      targetId: id,
      metadata: {
        previousStatus,
        newStatus,
        taskTitle: task.title,
        localId: task.localId
      }
    });
  }

  return updatedTask;
}
