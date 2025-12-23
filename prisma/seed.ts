import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create org
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Org Test',
      slug: 'org-test',
    },
  });

  console.log('✅ Organization created:', org.name);

  // Create user profile (simula usuário do Supabase Auth)
  const user = await prisma.userProfile.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      orgId: org.id,
      displayName: 'Dev User',
      role: 'OWNER',
    },
  });

  console.log('✅ User created:', user.displayName);
  console.log('\n🎉 Seed completed!');
  console.log('📋 Use these credentials:');
  console.log('   Org ID:', org.id);
  console.log('   User ID:', user.id);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
