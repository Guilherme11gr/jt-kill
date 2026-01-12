import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const task = await prisma.task.findUnique({
    where: { id: '0b69c86e-5a73-4d7b-a936-670f206698f5' },
    include: {
      feature: {
        select: {
          id: true,
          title: true,
          health: true,
          healthReason: true,
        }
      }
    }
  });
  console.log(JSON.stringify(task, null, 2));
  await prisma.$disconnect();
})();
