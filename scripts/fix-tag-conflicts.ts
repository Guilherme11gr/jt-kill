/**
 * Fix tag name conflicts by renaming doc_tags
 * Run BEFORE migration if conflicts are detected
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Corrigindo conflitos de nomes de tags...\n');

  // Encontrar conflitos
  const conflicts = await prisma.$queryRaw<
    Array<{
      project_id: string;
      tag_name: string;
      doc_tag_id: string;
    }>
  >`
    SELECT 
      dt.project_id,
      dt.name as tag_name,
      dt.id as doc_tag_id
    FROM doc_tags dt
    WHERE EXISTS (
      SELECT 1 FROM task_tags tt 
      WHERE tt.project_id = dt.project_id 
      AND tt.name = dt.name
    )
  `;

  if (conflicts.length === 0) {
    console.log('✅ Nenhum conflito encontrado.');
    return;
  }

  console.log(`Encontrados ${conflicts.length} conflito(s). Renomeando...\n`);

  for (const conflict of conflicts) {
    const oldName = conflict.tag_name;
    const newName = `${oldName} (Doc)`;
    
    try {
      await prisma.$executeRaw`
        UPDATE doc_tags 
        SET name = ${newName}
        WHERE id = ${conflict.doc_tag_id}::uuid
      `;
      
      console.log(`✅ Renomeado: "${oldName}" → "${newName}" (Projeto: ${conflict.project_id})`);
    } catch (error) {
      console.error(`❌ Erro ao renomear tag ${conflict.doc_tag_id}:`, error);
      process.exit(1);
    }
  }

  console.log(`\n✅ ${conflicts.length} conflito(s) corrigido(s) com sucesso!`);
  console.log('✅ Agora você pode executar a migração com segurança.\n');
}

main()
  .catch((error) => {
    console.error('❌ Erro ao corrigir conflitos:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
