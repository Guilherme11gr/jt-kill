import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infra/adapters/prisma';
import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant } from '@/shared/http/auth.helpers';
import { createHmac, timingSafeEqual } from 'crypto';

const STATE_SECRET = process.env.GITHUB_STATE_SECRET || process.env.NEXTAUTH_SECRET || 'default-state-secret';

interface StatePayload {
  projectId: string;
  orgId: string;
  timestamp: number;
  signature: string;
}

function generateStateSignature(projectId: string, orgId: string, timestamp: number): string {
  const payload = `${projectId}:${orgId}:${timestamp}`;
  return createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
}

function verifyStateSignature(state: StatePayload): boolean {
  const expectedSignature = generateStateSignature(state.projectId, state.orgId, state.timestamp);
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const actualBuffer = Buffer.from(state.signature, 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function isValidUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action');
  const stateParam = searchParams.get('state');

  if (!installationId) {
    return NextResponse.redirect(
      new URL('/projects?github_error=missing_installation', request.url)
    );
  }

  const installationIdNum = parseInt(installationId, 10);
  if (Number.isNaN(installationIdNum)) {
    return NextResponse.redirect(
      new URL('/projects?github_error=invalid_installation_id', request.url)
    );
  }

  let state: StatePayload | null = null;
  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
      if (
        isValidUuid(decoded.projectId) &&
        isValidUuid(decoded.orgId) &&
        typeof decoded.timestamp === 'number' &&
        typeof decoded.signature === 'string'
      ) {
        state = decoded;
      }
    } catch {
      // ignore malformed state
    }
  }

  if (state) {
    if (!verifyStateSignature(state)) {
      return NextResponse.redirect(
        new URL('/projects?github_error=invalid_state_signature', request.url)
      );
    }

    const stateAge = Date.now() - state.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/projects?github_error=state_expired', request.url)
      );
    }
  }

  if (setupAction === 'uninstall') {
    if (state?.projectId && state?.orgId) {
      await prisma.project.updateMany({
        where: {
          id: state.projectId,
          orgId: state.orgId,
          githubInstallationId: installationIdNum,
        },
        data: {
          githubInstallationId: null,
          githubRepoFullName: null,
          githubRepoUrl: null,
        },
      });
    }
    return NextResponse.redirect(
      new URL(`/projects/${state?.projectId || ''}?github=uninstalled`, request.url)
    );
  }

  if (!state) {
    const project = await prisma.project.findFirst({
      where: { githubInstallationId: installationIdNum },
      select: { id: true },
    });
    if (project) {
      return NextResponse.redirect(
        new URL(`/projects/${project.id}?github=installed`, request.url)
      );
    }
    return NextResponse.redirect(
      new URL('/projects?github=installed', request.url)
    );
  }

  try {
    const supabase = await createClient();
    const { tenantId } = await extractAuthenticatedTenant(supabase);

    if (tenantId !== state.orgId) {
      return NextResponse.redirect(
        new URL('/projects?github_error=unauthorized_org', request.url)
      );
    }
  } catch {
    return NextResponse.redirect(
      new URL('/login?redirect_reason=auth_required', request.url)
    );
  }

  await prisma.project.updateMany({
    where: { id: state.projectId, orgId: state.orgId },
    data: {
      githubInstallationId: installationIdNum,
    },
  });

  return NextResponse.redirect(
    new URL(`/projects/${state.projectId}?github=installed`, request.url)
  );
}

export function generateInstallState(projectId: string, orgId: string): string {
  const timestamp = Date.now();
  const signature = generateStateSignature(projectId, orgId, timestamp);
  const payload: StatePayload = { projectId, orgId, timestamp, signature };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}
