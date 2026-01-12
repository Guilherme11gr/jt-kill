import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBlockTask() {
  try {
    console.log('🧪 Testando bloqueio de task...\n');
    
    const taskId = '0b69c86e-5a73-4d7b-a936-670f206698f5';
    const orgId = '11111111-1111-1111-1111-111111111111';
    
    console.log(`Task ID: ${taskId}`);
    console.log(`Org ID: ${orgId}\n`);
    
    const result = await prisma.task.updateMany({
      where: {
        id: taskId,
        orgId,
      },
      data: {
        blocked: true,
      },
    });
    
    console.log('✅ SUCCESS!');
    console.log(`Updated ${result.count} tasks`);
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBlockTask();
