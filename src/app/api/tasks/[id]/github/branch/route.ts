import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { prisma } from '@/infra/adapters/prisma';
import { getRepository, getRef, createBranch } from '@/shared/github/api-client';

/**
 * POST /api/tasks/[id]/github/branch
 * Create a GitHub branch from a task.
 *
 * Branch name format: feat/{PROJECT_KEY}-{localId}-{slug-of-title}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    // 1. Fetch task with feature->epic->project relations
    const task = await prisma.task.findUnique({
      where: { id, orgId: tenantId },
      include: {
        feature: {
          include: {
            epic: {
              include: {
                project: {
                  select: {
                    id: true,
                    key: true,
                    githubInstallationId: true,
                    githubRepoFullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return jsonError('NOT_FOUND', 'Tarefa não encontrada', 404);
    }

    const project = task.feature.epic.project;

    // 2. Validate GitHub integration is configured
    if (!project.githubInstallationId || !project.githubRepoFullName) {
      return jsonError(
        'GITHUB_NOT_CONFIGURED',
        'Integração com GitHub não configurada neste projeto. Configure o repositório GitHub nas configurações do projeto.',
        404
      );
    }

    const installationId = project.githubInstallationId;
    const [owner, repo] = project.githubRepoFullName.split('/');

    if (!owner || !repo) {
      return jsonError(
        'INVALID_GITHUB_REPO',
        'Formato inválido do nome do repositório GitHub',
        400
      );
    }

    // 3. Get default branch from GitHub API
    const repository = await getRepository(installationId, owner, repo);
    const defaultBranch = repository.default_branch;

    // 4. Get latest commit SHA of default branch
    const ref = await getRef(installationId, owner, repo, `heads/${defaultBranch}`);
    const commitSha = ref.object.sha;

    // 5. Build branch name: feat/{PROJECT_KEY}-{localId}-{slug-of-title}
    const slug = task.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || task.localId.toString();

    const branchName = `feat/${project.key}-${task.localId}-${slug}`;

    // 6. Create the branch
    await createBranch(installationId, { owner, repo, branchName, sha: commitSha });

    // 7. Return result
    const branchUrl = `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branchName)}`;

    return jsonSuccess({
      branchName,
      branchUrl,
    });

  } catch (error) {
    const { status, body } = handleError(error);

    // Provide more context for GitHub API errors
    if (error instanceof Error && error.message.startsWith('GitHub API error')) {
      const githubStatusMatch = error.message.match(/\((\d+)/);
      const ghStatus = githubStatusMatch ? parseInt(githubStatusMatch[1], 10) : 502;

      if (ghStatus === 422) {
        return jsonError(
          'BRANCH_ALREADY_EXISTS',
          'Branch já existe neste repositório',
          409
        );
      }

      return jsonError(
        'GITHUB_API_ERROR',
        `Erro ao criar branch no GitHub: ${error.message}`,
        ghStatus === 404 ? 404 : 502
      );
    }

    return jsonError(
      body.error.code,
      body.error.message,
      status,
      body.error.details as Record<string, unknown>
    );
  }
}
