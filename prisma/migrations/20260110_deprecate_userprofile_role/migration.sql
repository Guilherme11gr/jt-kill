-- ⚠️ IMPORTANTE: Este script é INFORMATIVO
-- NÃO execute diretamente - use via Prisma Migrate
-- 
-- Para aplicar: npx prisma migrate deploy
--
-- Este script apenas adiciona um comentário ao campo role
-- NÃO altera dados nem estrutura da tabela

-- Adiciona comentário documentando que o campo está deprecated
COMMENT ON COLUMN public.user_profiles.role IS 
  'DEPRECATED: Use org_memberships.role instead. ' ||
  'This field is kept for backward compatibility only and will be removed in a future migration. ' ||
  'Source of truth: org_memberships table.';

-- Verificar que o comentário foi aplicado
-- (apenas para referência, não executado automaticamente)
/*
SELECT 
  col_description('user_profiles'::regclass, 
    (SELECT ordinal_position 
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
       AND table_name = 'user_profiles' 
       AND column_name = 'role')
  ) as role_column_comment;
*/

-- Futuras migrações farão:
-- 1. Remover todas as referências a UserProfile.role no código
-- 2. ALTER TABLE public.user_profiles DROP COLUMN role;
-- 3. Remover sync backward compatibility dos endpoints
