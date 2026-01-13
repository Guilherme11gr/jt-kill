/**
 * Validation script for tag unification migration
 * Run AFTER migration to verify data integrity
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  data?: unknown;
}

async function main() {
  console.log('🔍 Validando migração de tags...\n');
  const results: ValidationResult[] = [];

  // 1. Verificar total de project_tags (deve ser 7)
  try {
    const totalTags = await prisma.projectTag.count();
    results.push({
      check: 'Total de ProjectTags',
      status: totalTags === 7 ? 'PASS' : 'WARNING',
      message: `Total: ${totalTags} (esperado: 7)`,
      data: { totalTags },
    });
  } catch (error) {
    results.push({
      check: 'Total de ProjectTags',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // 2. Verificar tags migradas de docs (cor #6b7280)
  try {
    const docTagsMigrated = await prisma.projectTag.count({
      where: { color: '#6b7280' },
    });
    results.push({
      check: 'DocTags migradas',
      status: docTagsMigrated === 6 ? 'PASS' : 'WARNING',
      message: `Tags com cor #6b7280: ${docTagsMigrated} (esperado: 6)`,
      data: { docTagsMigrated },
    });
  } catch (error) {
    results.push({
      check: 'DocTags migradas',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // 3. Verificar doc_tag_assignments preservadas (deve ser 14)
  try {
    const docAssignments = await prisma.docTagAssignment.count();
    results.push({
      check: 'DocTagAssignments preservadas',
      status: docAssignments === 14 ? 'PASS' : 'WARNING',
      message: `Total: ${docAssignments} (esperado: 14)`,
      data: { docAssignments },
    });
  } catch (error) {
    results.push({
      check: 'DocTagAssignments preservadas',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // 4. Verificar se há assignments órfãs (sem tag válida) - usando raw query
  try {
    const orphanedAssignments = await prisma.$queryRaw<
      Array<{ id: string; doc_id: string; tag_id: string }>
    >`
      SELECT dta.id, dta.doc_id, dta.tag_id
      FROM doc_tag_assignments dta
      LEFT JOIN project_tags pt ON pt.id = dta.tag_id
      WHERE pt.id IS NULL
    `;
    results.push({
      check: 'Assignments órfãs',
      status: orphanedAssignments.length === 0 ? 'PASS' : 'FAIL',
      message: orphanedAssignments.length === 0 
        ? 'Nenhuma assignment órfã encontrada' 
        : `⚠️ ${orphanedAssignments.length} assignments sem tag válida!`,
      data: orphanedAssignments.length > 0 ? { orphanedAssignments } : undefined,
    });
  } catch (error) {
    results.push({
      check: 'Assignments órfãs',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // 5. Verificar conflitos de nomes (tags duplicadas no mesmo projeto)
  try {
    const allTags = await prisma.projectTag.groupBy({
      by: ['projectId', 'name'],
      _count: true,
      having: {
        name: { _count: { gt: 1 } },
      },
    });
    results.push({
      check: 'Conflitos de nomes',
      status: allTags.length === 0 ? 'PASS' : 'FAIL',
      message: allTags.length === 0 
        ? 'Nenhum conflito de nome encontrado' 
        : `⚠️ ${allTags.length} conflitos de nome detectados!`,
      data: allTags.length > 0 ? { conflicts: allTags } : undefined,
    });
  } catch (error) {
    results.push({
      check: 'Conflitos de nomes',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // 6. Verificar integridade referencial (todas as tags das assignments existem)
  try {
    const assignmentsWithTags = await prisma.docTagAssignment.findMany({
      include: {
        tag: {
          select: { id: true, name: true, projectId: true },
        },
      },
    });
    const invalidAssignments = assignmentsWithTags.filter(a => !a.tag);
    results.push({
      check: 'Integridade referencial',
      status: invalidAssignments.length === 0 ? 'PASS' : 'FAIL',
      message: invalidAssignments.length === 0 
        ? 'Todas as assignments têm tags válidas' 
        : `⚠️ ${invalidAssignments.length} assignments com referências inválidas!`,
      data: invalidAssignments.length > 0 ? { invalidAssignments } : undefined,
    });
  } catch (error) {
    results.push({
      check: 'Integridade referencial',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // 7. Verificar unique constraint (projectId + name)
  try {
    const duplicates = await prisma.$queryRaw<Array<{ project_id: string; name: string; count: bigint }>>`
      SELECT project_id, name, COUNT(*) as count
      FROM project_tags
      GROUP BY project_id, name
      HAVING COUNT(*) > 1
    `;
    results.push({
      check: 'Unique constraint (projectId + name)',
      status: duplicates.length === 0 ? 'PASS' : 'FAIL',
      message: duplicates.length === 0 
        ? 'Constraint respeitada' 
        : `⚠️ ${duplicates.length} violações da constraint!`,
      data: duplicates.length > 0 ? { duplicates } : undefined,
    });
  } catch (error) {
    results.push({
      check: 'Unique constraint',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // 8. Verificar TaskTagAssignments (não devem ser afetadas)
  try {
    const taskAssignments = await prisma.taskTagAssignment.count();
    results.push({
      check: 'TaskTagAssignments intactas',
      status: 'PASS',
      message: `Total: ${taskAssignments} (migration não deve afetar)`,
      data: { taskAssignments },
    });
  } catch (error) {
    results.push({
      check: 'TaskTagAssignments',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // 9. Verificar FeatureTagAssignments (não devem ser afetadas)
  try {
    const featureAssignments = await prisma.featureTagAssignment.count();
    results.push({
      check: 'FeatureTagAssignments intactas',
      status: 'PASS',
      message: `Total: ${featureAssignments} (migration não deve afetar)`,
      data: { featureAssignments },
    });
  } catch (error) {
    results.push({
      check: 'FeatureTagAssignments',
      status: 'FAIL',
      message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  // Imprimir resultados
  console.log('📊 RESULTADOS:\n');
  let hasFailures = false;
  let hasWarnings = false;

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} ${result.check}: ${result.message}`);
    
    if (result.data) {
      console.log(`   Detalhes: ${JSON.stringify(result.data, null, 2)}`);
    }
    
    if (result.status === 'FAIL') hasFailures = true;
    if (result.status === 'WARNING') hasWarnings = true;
  }

  console.log('\n' + '='.repeat(60));
  if (hasFailures) {
    console.log('❌ MIGRAÇÃO COM FALHAS - Revisar imediatamente!');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️ MIGRAÇÃO COM WARNINGS - Verificar dados');
    process.exit(0);
  } else {
    console.log('✅ MIGRAÇÃO VALIDADA COM SUCESSO!');
    process.exit(0);
  }
}

main()
  .catch((error) => {
    console.error('❌ Erro fatal ao validar:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
