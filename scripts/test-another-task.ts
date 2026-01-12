import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🧪 Testing another task...\n');
    const result = await prisma.task.updateMany({
      where: {
        id: 'acc258c8-9cde-4924-852b-81c85b52ccb3',
        orgId: '11111111-1111-1111-1111-111111111111',
      },
      data: { blocked: true },
    });
    console.log('✅ SUCCESS! Updated', result.count, 'tasks');
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
