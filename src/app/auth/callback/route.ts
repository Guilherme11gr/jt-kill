import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, inviteRepository, auditLogRepository, AUDIT_ACTIONS } from '@/infra/adapters/prisma';
import { invalidateMembershipCache, CURRENT_ORG_COOKIE } from '@/shared/http/auth.helpers';

// Cookie configuration (matches /api/org/switch)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Set the current org cookie to ensure user lands in correct org after signup
 */
async function setOrgCookie(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const inviteToken = searchParams.get('invite');
  const next = searchParams.get('next') ?? '/dashboard';

  console.log('[Auth Callback] Started. inviteToken from URL:', inviteToken);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      console.log('[Auth Callback] User:', data.user.id, 'Metadata:', data.user.user_metadata);

      // Check if user has any memberships (supports multi-org)
      const existingMembership = await prisma.orgMembership.findFirst({
        where: { userId: data.user.id },
      });

      console.log('[Auth Callback] Existing membership:', existingMembership?.id ?? 'None');

      if (!existingMembership) {
        // Check if this is an invite flow (token in URL or metadata)
        const tokenToUse = inviteToken || data.user.user_metadata?.invite_token;
        console.log('[Auth Callback] Token to use:', tokenToUse);

        let inviteAccepted = false;

        if (tokenToUse) {
          // INVITE FLOW: Accept invite and create membership
          try {
            const invite = await inviteRepository.findByToken(tokenToUse);
            console.log('[Auth Callback] Invite found:', invite?.id, 'Status:', invite?.status);

            if (invite && invite.status === 'PENDING' && invite.expiresAt > new Date()) {
              // Accept invite
              await inviteRepository.accept(tokenToUse, data.user.id);
              console.log('[Auth Callback] Invite accepted');

              // Create org membership (first org = default)
              await prisma.orgMembership.create({
                data: {
                  userId: data.user.id,
                  orgId: invite.orgId,
                  role: invite.role,
                  isDefault: true,
                },
              });

              // Create user profile for display info (backward compat)
              await prisma.userProfile.create({
                data: {
                  id: data.user.id,
                  orgId: invite.orgId,
                  displayName: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Usuário',
                  role: invite.role,
                },
              });
              console.log('[Auth Callback] Membership and UserProfile created for invite');

              // Invalidate cache (new membership)
              invalidateMembershipCache(data.user.id);

              // Set org cookie so user lands in correct org
              await setOrgCookie(invite.orgId);

              // Log the action
              await auditLogRepository.log({
                orgId: invite.orgId,
                userId: data.user.id,
                action: AUDIT_ACTIONS.USER_JOINED,
                targetType: 'user',
                targetId: data.user.id,
                metadata: { via: 'invite', inviteId: invite.id, role: invite.role },
              });

              inviteAccepted = true;
              return NextResponse.redirect(`${origin}/dashboard`);
            } else {
              // Invite expired or already used - will fall through to create default org
              console.log('[Auth Callback] Invite invalid or expired, will create default org as fallback');
            }
          } catch (e) {
            console.error('[Auth Callback] Error accepting invite:', e);
            // Don't redirect with error - fall through to create default org instead
            console.log('[Auth Callback] Will create default org as fallback after invite error');
          }
        }

        // NEW ORG FLOW: Create organization, membership, and profile
        // This also serves as FALLBACK when invite expired/failed
        if (!inviteAccepted) {
          const displayName = data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Usuário';
          // Use stored org_name if available, otherwise create default
          const orgName = data.user.user_metadata?.org_name || `Org de ${displayName}`;
          const wasInviteFlow = !!tokenToUse;
          console.log('[Auth Callback] Creating new org:', orgName, wasInviteFlow ? '(fallback from expired invite)' : '');

          // Generate slug from org name
          const baseSlug = orgName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          // Ensure unique slug with attempt limit
          let slug = baseSlug;
          let counter = 1;
          const MAX_ATTEMPTS = 100;
          while (await prisma.organization.findUnique({ where: { slug } })) {
            if (counter > MAX_ATTEMPTS) {
              return NextResponse.redirect(`${origin}/login?error=slug-generation-failed`);
            }
            slug = `${baseSlug}-${counter}`;
            counter++;
          }

          // Create organization, membership, and user profile in transaction
          const newOrg = await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
              data: {
                name: orgName,
                slug,
              },
            });

            // Create org membership (owner, default)
            await tx.orgMembership.create({
              data: {
                userId: data.user.id,
                orgId: org.id,
                role: 'OWNER',
                isDefault: true,
              },
            });

            // Create user profile for display info (backward compat)
            await tx.userProfile.create({
              data: {
                id: data.user.id,
                orgId: org.id,
                displayName,
                role: 'OWNER',
              },
            });

            return org;
          });
          
          // Invalidate cache (new membership)
          invalidateMembershipCache(data.user.id);
          
          // Set org cookie so user lands in correct org
          await setOrgCookie(newOrg.id);
          
          console.log('[Auth Callback] New org, membership, and profile created');
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error('[Auth Callback] Exchange code error:', error);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth-callback-error`);
}

