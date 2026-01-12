import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const result = await prisma.$queryRaw<Array<{ proname: string; def: string }>>`
    SELECT p.proname, pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
  `;
  
  for (const r of result) {
    if (r.def.includes('format(') && !r.def.includes('format_type')) {
      console.log('======== FUNCTION:', r.proname, '========');
      console.log(r.def);
      console.log('\n');
    }
  }
  
  await prisma.$disconnect();
})();
