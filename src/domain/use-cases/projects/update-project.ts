import type { Project } from '@/shared/types';
import type { ProjectRepository } from '@/infra/adapters/prisma';
import { NotFoundError, ValidationError } from '@/shared/errors';

export interface UpdateProjectInput {
  name?: string;
  // ⚠️ key é IMUTÁVEL - não incluído aqui
  description?: string | null;
  modules?: string[];
}

export interface UpdateProjectDeps {
  projectRepository: ProjectRepository;
}

/**
 * Update Project Use Case
 * 
 * Business Rules:
 * - key é IMUTÁVEL (não pode ser alterado após criação)
 * - Modules must be unique
 */
export async function updateProject(
  id: string,
  orgId: string,
  input: UpdateProjectInput,
  deps: UpdateProjectDeps
): Promise<Project> {
  const { projectRepository } = deps;

  // 1. Check project exists
  const existing = await projectRepository.findById(id, orgId);
  if (!existing) {
    throw new NotFoundError('Projeto', id);
  }

  // 2. Validate modules are unique
  if (input.modules) {
    const uniqueModules = [...new Set(input.modules)];
    if (uniqueModules.length !== input.modules.length) {
      throw new ValidationError('Módulos duplicados não são permitidos');
    }
  }

  // 3. Update
  return await projectRepository.update(id, orgId, input);
}
