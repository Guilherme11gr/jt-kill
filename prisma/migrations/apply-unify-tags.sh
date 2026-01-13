#!/bin/bash
# Script seguro para aplicar migration de unificação de tags
# Usa DIRECT_URL do .env.local

set -e  # Exit on error

echo "🔍 STEP 1: Verificando estado atual..."
psql "$DIRECT_URL" -c "SELECT COUNT(*) as task_tags FROM task_tags;" || echo "❌ task_tags não existe"
psql "$DIRECT_URL" -c "SELECT COUNT(*) as doc_tags FROM doc_tags;" || echo "✅ doc_tags já removido"

echo ""
echo "📊 STEP 2: Backup de dados (apenas contagem)..."
psql "$DIRECT_URL" -c "SELECT 
  (SELECT COUNT(*) FROM task_tags) as task_tags_count,
  (SELECT COUNT(*) FROM doc_tags) as doc_tags_count,
  (SELECT COUNT(*) FROM doc_tag_assignments) as doc_assignments_count;"

echo ""
echo "⚠️  STEP 3: Confirmação necessária!"
read -p "Deseja aplicar a migration? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Migration cancelada"
  exit 0
fi

echo ""
echo "🚀 STEP 4: Aplicando migration..."
psql "$DIRECT_URL" -f prisma/migrations/20260112_unify_tags/migration.sql

echo ""
echo "✅ STEP 5: Validando dados migrados..."
psql "$DIRECT_URL" -c "SELECT 
  (SELECT COUNT(*) FROM project_tags) as project_tags_total,
  (SELECT COUNT(*) FROM project_tags WHERE color = '#6b7280') as migrated_from_docs,
  (SELECT COUNT(*) FROM doc_tag_assignments) as doc_assignments_still_work;"

echo ""
echo "🎉 Migration completa! Tags unificados com sucesso."
