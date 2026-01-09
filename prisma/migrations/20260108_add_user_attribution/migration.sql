-- Migration: Add user attribution fields
-- Adds created_by to track who created entities

-- Add created_by to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by to project_notes
ALTER TABLE public.project_notes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by to project_docs  
ALTER TABLE public.project_docs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by to epics
ALTER TABLE public.epics ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by to features
ALTER TABLE public.features ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_project_notes_created_by ON public.project_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_epics_created_by ON public.epics(created_by);
CREATE INDEX IF NOT EXISTS idx_features_created_by ON public.features(created_by);
