-- Seed script para criar Organization e UserProfile para Guilherme
-- Execute no Supabase SQL Editor ou via `psql`

-- 1. Criar nova organização
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Guilherme Workspace',
  'guilherme-workspace',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Criar UserProfile vinculando o userId do Supabase Auth à organização
INSERT INTO user_profiles (id, org_id, display_name, role, created_at, updated_at)
VALUES (
  '9f364d23-9de1-4654-ba02-19d5720d38c9',  -- Seu userId do Supabase Auth
  '11111111-1111-1111-1111-111111111111',  -- org_id criado acima
  'Guilherme',
  'OWNER',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verificar se foi criado
SELECT * FROM user_profiles WHERE id = '9f364d23-9de1-4654-ba02-19d5720d38c9';
