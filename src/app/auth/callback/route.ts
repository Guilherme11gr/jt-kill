import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { prisma, inviteRepository, auditLogRepository, AUDIT_ACTIONS } from '@/infra/adapters/prisma';

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

      // Check if user has a profile
      const existingProfile = await prisma.userProfile.findUnique({
        where: { id: data.user.id },
      });

      console.log('[Auth Callback] Existing profile:', existingProfile?.id ?? 'None');

      if (!existingProfile) {
        // Check if this is an invite flow (token in URL or metadata)
        const tokenToUse = inviteToken || data.user.user_metadata?.invite_token;
        console.log('[Auth Callback] Token to use:', tokenToUse);

        if (tokenToUse) {
          // INVITE FLOW: Accept invite instead of creating new org
          try {
            const invite = await inviteRepository.findByToken(tokenToUse);
            console.log('[Auth Callback] Invite found:', invite?.id, 'Status:', invite?.status);

            if (invite && invite.status === 'PENDING' && invite.expiresAt > new Date()) {
              // Accept invite
              await inviteRepository.accept(tokenToUse, data.user.id);
              console.log('[Auth Callback] Invite accepted');

              // Create user profile in the organization
              await prisma.userProfile.create({
                data: {
                  id: data.user.id,
                  orgId: invite.orgId,
                  displayName: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Usuário',
                  role: invite.role,
                },
              });
              console.log('[Auth Callback] UserProfile created for invite');

              // Log the action
              await auditLogRepository.log({
                orgId: invite.orgId,
                userId: data.user.id,
                action: AUDIT_ACTIONS.USER_JOINED,
                targetType: 'user',
                targetId: data.user.id,
                metadata: { via: 'invite', inviteId: invite.id, role: invite.role },
              });

              return NextResponse.redirect(`${origin}/dashboard`);
            } else {
              console.log('[Auth Callback] Invite invalid or expired');
            }
          } catch (e) {
            console.error('[Auth Callback] Error accepting invite:', e);
            return NextResponse.redirect(`${origin}/login?error=invite-accept-failed`);
          }
        }

        // NEW ORG FLOW: Create organization and profile (only if no invite token)
        if (!tokenToUse) {
          const displayName = data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Usuário';
          const orgName = data.user.user_metadata?.org_name || `Org de ${displayName}`;
          console.log('[Auth Callback] Creating new org:', orgName);

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

          // Create organization and user profile in transaction
          await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
              data: {
                name: orgName,
                slug,
              },
            });

            await tx.userProfile.create({
              data: {
                id: data.user.id,
                orgId: org.id,
                displayName,
                role: 'OWNER', // First user is always OWNER
              },
            });
          });
          console.log('[Auth Callback] New org and profile created');
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
