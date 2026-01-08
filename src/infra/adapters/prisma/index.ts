import { PrismaClient } from '@prisma/client';
import { ProjectRepository } from './project.repository';
import { EpicRepository } from './epic.repository';
import { FeatureRepository } from './feature.repository';
import { TaskRepository } from './task.repository';
import { CommentRepository } from './comment.repository';
import { ProjectDocRepository } from './project-doc.repository';
import { ProjectNoteRepository } from './project-note.repository';
import { UserProfileRepository } from './user-profile.repository';
import { DocTagRepository } from './doc-tag.repository';
import { InviteRepository } from './invite.repository';
import { AuditLogRepository } from './audit-log.repository';

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
export const projectNoteRepository = new ProjectNoteRepository(prisma);
export const userProfileRepository = new UserProfileRepository(prisma);
export const docTagRepository = new DocTagRepository(prisma);
export const inviteRepository = new InviteRepository(prisma);
export const auditLogRepository = new AuditLogRepository(prisma);

// Re-export for convenience
export {
  ProjectRepository,
  EpicRepository,
  FeatureRepository,
  TaskRepository,
  CommentRepository,
  ProjectDocRepository,
  ProjectNoteRepository,
  UserProfileRepository,
  DocTagRepository,
  InviteRepository,
  AuditLogRepository,
};

// Re-export audit action constants
export { AUDIT_ACTIONS, type AuditAction } from './audit-log.repository';
