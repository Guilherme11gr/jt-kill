import { createClient } from '@/lib/supabase/server';
import { extractAuthenticatedTenant, requireRole } from '@/shared/http/auth.helpers';
import { jsonSuccess, jsonError } from '@/shared/http/responses';
import { handleError } from '@/shared/errors';
import { agentApiKeyRepository, auditLogRepository } from '@/infra/adapters/prisma';
import { generateAgentApiKey } from '@/shared/http/agent-api-key';

export const dynamic = 'force-dynamic';

function serializeAgentKey(record: {
  id: string;
  keyPrefix: string;
  createdAt: Date;
  rotatedAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedAgentName: string | null;
} | null) {
  if (!record) {
    return {
      hasKey: false,
      keyPrefix: null,
      createdAt: null,
      rotatedAt: null,
      lastUsedAt: null,
      lastUsedAgentName: null,
    };
  }

  return {
    hasKey: true,
    keyPrefix: record.keyPrefix,
    createdAt: record.createdAt,
    rotatedAt: record.rotatedAt,
    lastUsedAt: record.lastUsedAt,
    lastUsedAgentName: record.lastUsedAgentName,
  };
}

export async function GET() {
  try {
    const authClient = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(authClient);

    await requireRole(authClient, userId, ['OWNER'], tenantId);

    const record = await agentApiKeyRepository.findByOrgId(tenantId);

    return jsonSuccess(serializeAgentKey(record), {
      private: true,
      orgId: tenantId,
    });
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}

export async function POST() {
  try {
    const authClient = await createClient();
    const { userId, tenantId } = await extractAuthenticatedTenant(authClient);

    await requireRole(authClient, userId, ['OWNER'], tenantId);

    const current = await agentApiKeyRepository.findByOrgId(tenantId);
    const generated = generateAgentApiKey();
    const { record, rotated } = await agentApiKeyRepository.upsertForOrg({
      orgId: tenantId,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      createdBy: userId,
    });

    await auditLogRepository.log({
      orgId: tenantId,
      userId,
      action: rotated ? 'agent_key.rotated' : 'agent_key.generated',
      targetType: 'agent_api_key',
      targetId: record.id,
      metadata: {
        keyPrefix: generated.keyPrefix,
        authMethod: 'tenant_api_key',
        replacedExistingKey: Boolean(current),
      },
    });

    return jsonSuccess(
      {
        ...serializeAgentKey(record),
        token: generated.token,
        wasRotated: rotated,
      },
      {
        status: rotated ? 200 : 201,
        private: true,
        orgId: tenantId,
      }
    );
  } catch (error) {
    const { status, body } = handleError(error);
    return jsonError(body.error.code, body.error.message, status);
  }
}
