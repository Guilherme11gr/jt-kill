-- Seed data para desenvolvimento
-- Cria organização e usuário de teste

INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Org Test', 'org-test', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (id, org_id, email, full_name, role, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'dev@test.com', 'Dev User', 'OWNER', now(), now())
ON CONFLICT (id) DO NOTHING;
