import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Searching for features with problematic health_reason...\n');
    
    const features = await prisma.feature.findMany({
      where: {
        healthReason: {
          contains: '%'
        }
      },
      select: {
        id: true,
        title: true,
        healthReason: true,
      }
    });
    
    console.log(`Found ${features.length} features with % in health_reason:\n`);
    features.forEach(f => {
      console.log(`- ${f.title}`);
      console.log(`  Health Reason: "${f.healthReason}"`);
      console.log(`  ID: ${f.id}\n`);
    });
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
