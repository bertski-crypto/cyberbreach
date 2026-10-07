-- 001: initial CYBER//BREACH schema
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  replaced_by UUID
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  codename TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 99),
  current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  rank TEXT NOT NULL DEFAULT 'Junior Analyst',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_skills (
  player_id UUID PRIMARY KEY REFERENCES player_profiles(id) ON DELETE CASCADE,
  threat_detection INTEGER NOT NULL DEFAULT 10 CHECK (threat_detection BETWEEN 0 AND 100),
  incident_response INTEGER NOT NULL DEFAULT 10 CHECK (incident_response BETWEEN 0 AND 100),
  network_defense INTEGER NOT NULL DEFAULT 10 CHECK (network_defense BETWEEN 0 AND 100),
  firewall_management INTEGER NOT NULL DEFAULT 10 CHECK (firewall_management BETWEEN 0 AND 100),
  decision_making INTEGER NOT NULL DEFAULT 10 CHECK (decision_making BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_attempts (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  client_key TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 20000),
  rating TEXT NOT NULL DEFAULT 'F' CHECK (rating IN ('S','A_PLUS','A','B','C','D','F')),
  network_health INTEGER NOT NULL DEFAULT 100 CHECK (network_health BETWEEN 0 AND 100),
  response_time DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (response_time >= 0 AND response_time < 3600),
  xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned BETWEEN 0 AND 20000),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  objectives_done INTEGER NOT NULL DEFAULT 0 CHECK (objectives_done >= 0),
  objectives_total INTEGER NOT NULL DEFAULT 0 CHECK (objectives_total >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, client_key)
);
CREATE INDEX IF NOT EXISTS idx_attempts_player ON mission_attempts(player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE RESTRICT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_player_ach_player ON player_achievements(player_id);

CREATE TABLE IF NOT EXISTS player_statistics (
  player_id UUID PRIMARY KEY REFERENCES player_profiles(id) ON DELETE CASCADE,
  missions_played INTEGER NOT NULL DEFAULT 0 CHECK (missions_played >= 0),
  missions_completed INTEGER NOT NULL DEFAULT 0 CHECK (missions_completed >= 0),
  threats_detected INTEGER NOT NULL DEFAULT 0 CHECK (threats_detected >= 0),
  threats_contained INTEGER NOT NULL DEFAULT 0 CHECK (threats_contained >= 0),
  threats_failed INTEGER NOT NULL DEFAULT 0 CHECK (threats_failed >= 0),
  total_score BIGINT NOT NULL DEFAULT 0 CHECK (total_score >= 0),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  best_rating TEXT NOT NULL DEFAULT 'F',
  fastest_response_time DOUBLE PRECISION,
  best_network_health INTEGER NOT NULL DEFAULT 0 CHECK (best_network_health BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_sessions (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('ADAPTIVE_SCENARIO','AI_TRAINING','DEBRIEF','FREE_SIMULATION')),
  difficulty TEXT NOT NULL DEFAULT 'NORMAL',
  training_focus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_player ON ai_sessions(player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_analysis (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  ai_session_id UUID REFERENCES ai_sessions(id) ON DELETE SET NULL,
  overall_skill INTEGER NOT NULL CHECK (overall_skill BETWEEN 0 AND 100),
  strongest_skill TEXT NOT NULL,
  weakest_skill TEXT NOT NULL,
  recommended_difficulty TEXT NOT NULL,
  performance_trend TEXT NOT NULL,
  training_focus TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_player ON ai_analysis(player_id, created_at DESC);
