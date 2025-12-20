import { PrismaClient } from '@prisma/client';
import { ProjectRepository } from './project.repository';
import { EpicRepository } from './epic.repository';
import { FeatureRepository } from './feature.repository';
import { TaskRepository } from './task.repository';
import { CommentRepository } from './comment.repository';
import { ProjectDocRepository } from './project-doc.repository';
import { UserProfileRepository } from './user-profile.repository';

// Singleton Prisma Client
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prismaclient-in-long-running-applications
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Repository instances
export const projectRepository = new ProjectRepository(prisma);
export const epicRepository = new EpicRepository(prisma);
export const featureRepository = new FeatureRepository(prisma);
export const taskRepository = new TaskRepository(prisma);
export const commentRepository = new CommentRepository(prisma);
export const projectDocRepository = new ProjectDocRepository(prisma);
export const userProfileRepository = new UserProfileRepository(prisma);

// Re-export for convenience
export {
  ProjectRepository,
  EpicRepository,
  FeatureRepository,
  TaskRepository,
  CommentRepository,
  ProjectDocRepository,
  UserProfileRepository,
};




