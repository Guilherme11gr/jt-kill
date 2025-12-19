import { z } from 'zod';

// UUID validator
export const uuidSchema = z.string().uuid('ID inválido');

// Slug validator (URL-friendly)
export const slugSchema = z
  .string()
  .min(2, 'Mínimo 2 caracteres')
  .max(50, 'Máximo 50 caracteres')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Apenas letras minúsculas, números e hífens');

// Project key validator (e.g., APP, SDK)
export const projectKeySchema = z
  .string()
  .min(2, 'Mínimo 2 caracteres')
  .max(10, 'Máximo 10 caracteres')
  .regex(/^[A-Z0-9]+$/, 'Apenas letras maiúsculas e números');

// Pagination validator
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Task status validator
export const taskStatusSchema = z.enum([
  'BACKLOG',
  'TODO',
  'DOING',
  'REVIEW',
  'QA_READY',
  'DONE',
]);

// Task type validator
export const taskTypeSchema = z.enum(['TASK', 'BUG']);

// Task priority validator
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// Story points validator (Fibonacci)
export const storyPointsSchema = z
  .number()
  .int()
  .refine((v) => [1, 2, 3, 5, 8, 13, 21].includes(v), 'Deve ser Fibonacci')
  .nullable();

// Create task input validator
export const createTaskSchema = z.object({
  featureId: uuidSchema,
  title: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(10000).nullable().optional(),
  type: taskTypeSchema.default('TASK'),
  priority: taskPrioritySchema.default('MEDIUM'),
  points: storyPointsSchema.optional(),
  module: z.string().max(50).nullable().optional(),
  assigneeId: uuidSchema.nullable().optional(),
});

// Update task input validator
export const updateTaskSchema = createTaskSchema.partial().extend({
  status: taskStatusSchema.optional(),
});

// Create comment validator
export const createCommentSchema = z.object({
  taskId: uuidSchema,
  content: z.string().min(1, 'Comentário não pode ser vazio').max(10000),
});

// Helper to parse with error handling
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result;
}
