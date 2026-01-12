import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const result = await prisma.$queryRaw<Array<{ definition: string }>>`
    SELECT pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'recalc_feature_health';
  `;
  console.log(result[0]?.definition || 'NOT FOUND');
  await prisma.$disconnect();
})();
