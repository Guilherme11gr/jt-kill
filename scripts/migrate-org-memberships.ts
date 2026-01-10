/**
 * Migration script: Populate org_memberships from existing user_profiles
 * This is a one-time migration script - safe to run multiple times (uses ON CONFLICT DO NOTHING)
 * 
 * NOTE: This script was used during the migration from UserProfile.orgId to OrgMembership.
 * With orgId now nullable in UserProfile, this script handles legacy data.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration: user_profiles -> org_memberships');

  // Get all existing user profiles that have orgId set (legacy data)
  const profiles = await prisma.userProfile.findMany({
    where: {
      orgId: { not: null }
    }
  });
  console.log(`Found ${profiles.length} user profiles with orgId to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    // Skip if orgId is null (shouldn't happen due to filter, but TypeScript safety)
    if (!profile.orgId) {
      skipped++;
      continue;
    }

    try {
      // Check if membership already exists
      const existing = await prisma.orgMembership.findUnique({
        where: {
          userId_orgId: {
            userId: profile.id,
            orgId: profile.orgId,
          }
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create membership
      await prisma.orgMembership.create({
        data: {
          userId: profile.id,
          orgId: profile.orgId,
          role: profile.role,
          isDefault: true,
        }
      });
      migrated++;
    } catch (e) {
      console.error(`Error migrating profile ${profile.id}:`, e);
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${skipped} already existed or skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
