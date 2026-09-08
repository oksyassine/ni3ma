-- Add missing member fields (run once on server)
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS father_phone TEXT,
  ADD COLUMN IF NOT EXISTS mother_phone TEXT,
  ADD COLUMN IF NOT EXISTS siblings_count INTEGER,
  ADD COLUMN IF NOT EXISTS sibling_order INTEGER,
  ADD COLUMN IF NOT EXISTS health_conditions TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT;
