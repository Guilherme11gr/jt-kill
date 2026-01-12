/**
 * Script para debugar triggers e functions do PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTriggers() {
  console.log('🔍 Investigando triggers e functions...\n');

  // 1. Listar triggers na tabela tasks
  const triggers = await prisma.$queryRaw<Array<{
    trigger_name: string;
    event_manipulation: string;
    action_statement: string;
  }>>`
    SELECT 
      trigger_name,
      event_manipulation,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' 
      AND event_object_table = 'tasks'
    ORDER BY trigger_name;
  `;

  console.log('📌 Triggers na tabela tasks:');
  console.log(JSON.stringify(triggers, null, 2));
  console.log('\n');

  // 2. Buscar definição das funções específicas
  const functions = [
    'trigger_propagate_health',
    'trigger_set_status_changed_at',
    'set_task_local_id',
    'propagate_ids_to_task',
    'update_updated_at'
  ];

  for (const funcName of functions) {
    try {
      const funcDef = await prisma.$queryRaw<Array<{ definition: string }>>`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = ${funcName};
      `;

      console.log(`\n🔧 Function: ${funcName}`);
      console.log(funcDef[0]?.definition || 'NOT FOUND');
      console.log('\n' + '='.repeat(80) + '\n');
    } catch (err) {
      console.error(`❌ Error fetching ${funcName}:`, err);
    }
  }

  // 3. Verificar constraints na tabela tasks
  const constraints = await prisma.$queryRaw<Array<{
    constraint_name: string;
    constraint_type: string;
  }>>`
    SELECT 
      conname as constraint_name,
      contype as constraint_type
    FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
    ORDER BY conname;
  `;

  console.log('🔒 Constraints na tabela tasks:');
  console.log(JSON.stringify(constraints, null, 2));
}

debugTriggers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
