-- FLXO-348: Add session metadata columns for session management
ALTER TABLE public.agent_sessions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.agent_sessions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.agent_sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT;

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_tenant
  ON public.agent_sessions (user_id, tenant_id, updated_at DESC);
