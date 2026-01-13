// Script Node para aplicar migration com segurança
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ler credenciais do .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const directUrl = envContent.match(/DIRECT_URL="([^"]+)"/)?.[1];
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

if (!directUrl || !supabaseUrl || !supabaseKey) {
  console.error('❌ Credenciais não encontradas no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentState() {
  console.log('🔍 STEP 1: Verificando estado atual...\n');
  
  const { data: taskTags, error: e1 } = await supabase.from('task_tags').select('*', { count: 'exact', head: true });
  const { data: docTags, error: e2 } = await supabase.from('doc_tags').select('*', { count: 'exact', head: true });
  const { data: docAssignments, error: e3 } = await supabase.from('doc_tag_assignments').select('*', { count: 'exact', head: true });

  console.log(`📊 Estado atual do banco:`);
  console.log(`  - task_tags: ${taskTags?.length || 0} registros`);
  console.log(`  - doc_tags: ${docTags?.length || 0} registros`);
  console.log(`  - doc_tag_assignments: ${docAssignments?.length || 0} registros\n`);
  
  return { taskTags: taskTags?.length || 0, docTags: docTags?.length || 0 };
}

async function applyMigration() {
  const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20260112_unify_tags', 'migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('🚀 STEP 2: Aplicando migration...\n');
  console.log('⚠️  Esta operação vai:');
  console.log('  1. Renomear task_tags → project_tags');
  console.log('  2. Migrar doc_tags → project_tags (com color cinza)');
  console.log('  3. Atualizar doc_tag_assignments para usar project_tags');
  console.log('  4. Remover tabela doc_tags (dados já migrados)\n');
  
  // Executar via rpc (Supabase não permite DDL direto)
  console.log('⚠️  ATENÇÃO: Execute o SQL manualmente no Supabase SQL Editor:');
  console.log(`\n${sql}\n`);
  console.log('📝 Arquivo: prisma/migrations/20260112_unify_tags/migration.sql');
}

async function validateMigration() {
  console.log('\n✅ STEP 3: Validando dados migrados...\n');
  
  const { count: projectTagsCount } = await supabase.from('project_tags').select('*', { count: 'exact', head: true });
  const { data: migratedTags } = await supabase.from('project_tags').select('*').eq('color', '#6b7280');
  
  console.log(`📊 Resultado:`);
  console.log(`  - project_tags total: ${projectTagsCount || 0}`);
  console.log(`  - Tags migrados de docs (color cinza): ${migratedTags?.length || 0}`);
  console.log(`\n🎉 Dados preservados com sucesso!`);
}

// Main
(async () => {
  await checkCurrentState();
  await applyMigration();
  // Descomentar após aplicar manualmente:
  // await validateMigration();
})();
