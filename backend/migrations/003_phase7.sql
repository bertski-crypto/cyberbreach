-- 003: Phase 7 — roles, streaks, daily challenges, leaderboard indexes
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'PLAYER'
  CHECK (role IN ('PLAYER','ADMIN'));

ALTER TABLE player_statistics
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0);

CREATE TABLE IF NOT EXISTS daily_challenges (
  challenge_date DATE PRIMARY KEY,
  mission_id TEXT NOT NULL,
  required_threats INTEGER NOT NULL DEFAULT 3,
  min_health INTEGER NOT NULL DEFAULT 85,
  reward_xp INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_completions (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL REFERENCES daily_challenges(challenge_date) ON DELETE CASCADE,
  attempt_id UUID NOT NULL REFERENCES mission_attempts(id) ON DELETE CASCADE,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, challenge_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_completions_player ON daily_completions(player_id);

-- Leaderboard query support
CREATE INDEX IF NOT EXISTS idx_attempts_mission_score ON mission_attempts(mission_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_stats_total_score ON player_statistics(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_stats_best_score ON player_statistics(best_score DESC);
CREATE INDEX IF NOT EXISTS idx_stats_threats_contained ON player_statistics(threats_contained DESC);
