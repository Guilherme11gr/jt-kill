import type { Project } from '@/shared/types';
import type { ProjectRepository, EpicRepository, FeatureRepository } from '@/infra/adapters/prisma';
import { ConflictError, ValidationError } from '@/shared/errors';

export interface CreateProjectInput {
  orgId: string;
  name: string;
  key: string;
  description?: string | null;
  modules?: string[];
}

export interface CreateProjectDeps {
  projectRepository: ProjectRepository;
  epicRepository: EpicRepository;
  featureRepository: FeatureRepository;
}

/**
 * Create Project Use Case
 * 
 * Business Rules:
 * - Project key must be unique per organization
 * - Key is always uppercase (2-10 chars)
 * - Modules must be unique strings
 * - Automatically creates Sustentation Epic and Feature (Smart Orphan)
 */
export async function createProject(
  input: CreateProjectInput,
  deps: CreateProjectDeps
): Promise<Project> {
  const { projectRepository, epicRepository, featureRepository } = deps;

  // 1. Validate key format
  const keyRegex = /^[A-Z0-9]{2,10}$/;
  if (!keyRegex.test(input.key.toUpperCase())) {
    throw new ValidationError(
      'Key deve ter 2-10 caracteres (apenas letras maiúsculas e números)'
    );
  }

  // 2. Validate modules are unique
  if (input.modules) {
    const uniqueModules = [...new Set(input.modules)];
    if (uniqueModules.length !== input.modules.length) {
      throw new ValidationError('Módulos duplicados não são permitidos');
    }
  }

  // 3. Create project (DB constraint will prevent duplicates)
  let project: Project;
  try {
    project = await projectRepository.create({
      orgId: input.orgId,
      name: input.name,
      key: input.key.toUpperCase(),
      description: input.description,
      modules: input.modules ?? [],
    });
  } catch (error: unknown) {
    // Prisma throws P2002 for unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw new ConflictError(`Projeto com key "${input.key}" já existe`);
    }
    throw error;
  }

  // 4. Create Sustentation structure (Smart Orphan Handling)
  const sustentationEpic = await epicRepository.create({
    orgId: input.orgId,
    projectId: project.id,
    title: 'Sustentação & Backlog Geral',
    description: 'Container para bugs de produção, débitos técnicos e melhorias que não pertencem a features ativas.',
    isSystem: true,
  });

  await featureRepository.create({
    orgId: input.orgId,
    epicId: sustentationEpic.id,
    title: 'Bugs de Produção & Melhorias',
    description: 'Tasks órfãs são vinculadas aqui automaticamente.',
    isSystem: true,
  });

  return project;
}

