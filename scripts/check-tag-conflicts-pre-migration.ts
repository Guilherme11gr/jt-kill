/**
 * Pre-migration check: Detect tag name conflicts
 * Run BEFORE migration to prevent data loss
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando conflitos de nomes ANTES da migração...\n');

  // Verificar se há task_tags e doc_tags com mesmo nome no mesmo projeto
  const conflicts = await prisma.$queryRaw<
    Array<{
      project_id: string;
      tag_name: string;
      task_tag_id: string;
      doc_tag_id: string;
    }>
  >`
    SELECT 
      tt.project_id,
      tt.name as tag_name,
      tt.id as task_tag_id,
      dt.id as doc_tag_id
    FROM task_tags tt
    JOIN doc_tags dt ON dt.project_id = tt.project_id AND dt.name = tt.name
  `;

  if (conflicts.length === 0) {
    console.log('✅ Nenhum conflito de nome detectado!');
    console.log('✅ A migração pode ser executada com segurança.\n');
    return;
  }

  console.log(`❌ ${conflicts.length} CONFLITO(S) DETECTADO(S):\n`);
  
  for (const conflict of conflicts) {
    console.log(`  Projeto: ${conflict.project_id}`);
    console.log(`  Tag duplicada: "${conflict.tag_name}"`);
    console.log(`    - TaskTag ID: ${conflict.task_tag_id}`);
    console.log(`    - DocTag ID: ${conflict.doc_tag_id}`);
    console.log('');
  }

  console.log('⚠️ AÇÃO NECESSÁRIA:');
  console.log('Execute o script de correção ANTES da migração:');
  console.log('  npx tsx scripts/fix-tag-conflicts.ts\n');
  
  process.exit(1);
}

main()
  .catch((error) => {
    console.error('❌ Erro ao verificar conflitos:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
