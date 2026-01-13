-- Migration: Add blockedAt and blockedBy for audit trail
-- Generated at: 2026-01-13

-- Add blockedAt timestamp
ALTER TABLE tasks ADD COLUMN blocked_at TIMESTAMPTZ;
COMMENT ON COLUMN tasks.blocked_at IS 'Timestamp when task was last blocked';

-- Add blockedBy user tracking
ALTER TABLE tasks ADD COLUMN blocked_by UUID REFERENCES users(id) ON DELETE SET NULL;
COMMENT ON COLUMN tasks.blocked_by IS 'User who blocked the task (for audit trail)';

-- Create index for audit queries
CREATE INDEX idx_tasks_blocked_at ON tasks(blocked_at) WHERE blocked_at IS NOT NULL;
CREATE INDEX idx_tasks_blocked_by ON tasks(blocked_by) WHERE blocked_by IS NOT NULL;
