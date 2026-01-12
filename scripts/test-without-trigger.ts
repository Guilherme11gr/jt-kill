import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔧 Disabling trigger...\n');
    
    // Disable trigger
    await prisma.$executeRawUnsafe(`
      ALTER TABLE tasks DISABLE TRIGGER task_propagate_health_update;
    `);
    
    console.log('✅ Trigger disabled');
    
    // Try update
    console.log('\n🧪 Testing update...\n');
    const result = await prisma.task.updateMany({
      where: {
        id: '0b69c86e-5a73-4d7b-a936-670f206698f5',
        orgId: '11111111-1111-1111-1111-111111111111',
      },
      data: { blocked: true },
    });
    
    console.log('✅ SUCCESS! Updated', result.count, 'tasks');
    
    // Re-enable trigger
    await prisma.$executeRawUnsafe(`
      ALTER TABLE tasks ENABLE TRIGGER task_propagate_health_update;
    `);
    
    console.log('✅ Trigger re-enabled');
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
