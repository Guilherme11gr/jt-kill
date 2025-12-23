import type { TaskType, TaskPriority } from '@/shared/types';

/**
 * Context for Task Description Improvement
 */
export interface TaskDescriptionContext {
    task: {
        title: string;
        description: string | null;
        type: TaskType;
        priority: TaskPriority;
    };
    feature: {
        title: string;
        description: string | null;
    };
}

/**
 * Build context for task description improvement
 * Extracts relevant data from task and feature
 */
export function buildTaskDescriptionContext(
    task: {
        title: string;
        description: string | null;
        type: TaskType;
        priority: TaskPriority;
        feature: { title: string };
    },
    featureDescription?: string | null
): TaskDescriptionContext {
    return {
        task: {
            title: task.title,
            description: task.description,
            type: task.type,
            priority: task.priority,
        },
        feature: {
            title: task.feature.title,
            description: featureDescription ?? null,
        },
    };
}
