-- Migration: add_block_reason_to_tasks
-- Add blockReason field to tasks table for capturing reason when blocking a task

-- ============================================================================
-- STEP 1: Add blockReason column (nullable, allows existing tasks to remain valid)
-- ============================================================================
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- ============================================================================
-- STEP 2: Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN public.tasks.block_reason IS 'Motivo obrigatório ao bloquear uma task. Mantém histórico mesmo após desbloquear.';

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- Verificar que coluna foi criada:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND table_name = 'tasks' 
--   AND column_name = 'block_reason';
