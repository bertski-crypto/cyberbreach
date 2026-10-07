-- 004: per-attempt threat counts (daily challenge verification)
ALTER TABLE mission_attempts
  ADD COLUMN IF NOT EXISTS threats_contained INTEGER NOT NULL DEFAULT 0 CHECK (threats_contained >= 0);
