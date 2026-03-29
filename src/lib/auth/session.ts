import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { ServerAuthSession, ServerAuthUser, SessionStatus } from "@/shared/types/auth.types";

type BetterAuthSessionPayload = {
  user?: Record<string, unknown> | null;
  session?: Record<string, unknown> | null;
} | null;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function mapAuthUser(user: unknown): ServerAuthUser | null {
  if (!user || typeof user !== "object") {
    return null;
  }

  const source = user as Record<string, unknown>;
  const userMetadata = asRecord(source.userMetadata);
  const appMetadata = asRecord(source.appMetadata);

  return {
    id: String(source.id),
    email: typeof source.email === "string" ? source.email : null,
    name: typeof source.name === "string" ? source.name : null,
    image: typeof source.image === "string" ? source.image : null,
    emailVerified: Boolean(source.emailVerified),
    forcePasswordReset: Boolean(source.forcePasswordReset),
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  };
}

export function mapAuthSession(payload: BetterAuthSessionPayload): ServerAuthSession | null {
  if (!payload?.user) {
    return null;
  }

  const user = mapAuthUser(payload.user);
  if (!user) {
    return null;
  }

  const session = payload.session && typeof payload.session === "object"
    ? payload.session as Record<string, unknown>
    : null;

  return {
    user,
    session: session
      ? {
          id: String(session.id),
          expiresAt: typeof session.expiresAt === "string"
            ? session.expiresAt
            : session.expiresAt instanceof Date
              ? session.expiresAt.toISOString()
              : null,
        }
      : null,
  };
}

export async function getServerAuthSession(): Promise<ServerAuthSession | null> {
  const headerStore = await headers();
  const session = await auth.api.getSession({
    headers: headerStore,
  });

  return mapAuthSession(session as BetterAuthSessionPayload);
}

export async function getServerSessionStatus(): Promise<SessionStatus> {
  const session = await getServerAuthSession();

  return {
    authenticated: Boolean(session?.user),
    userId: session?.user.id ?? null,
    forcePasswordReset: Boolean(session?.user.forcePasswordReset),
  };
}
