CREATE TABLE IF NOT EXISTS public.agent_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  rotated_at timestamptz(6),
  last_used_at timestamptz(6),
  last_used_agent_name text
);

CREATE INDEX IF NOT EXISTS idx_agent_api_keys_last_used_at
  ON public.agent_api_keys (last_used_at);
