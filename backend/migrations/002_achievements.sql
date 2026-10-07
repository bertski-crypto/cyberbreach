-- 002: achievement catalogue (idempotent; mirrored from game data)
INSERT INTO achievements(id, name, description, category, rarity, xp_reward) VALUES
  ('first-response', 'First Response', 'Contain your first cybersecurity incident.', 'CAMPAIGN', 'COMMON', 100),
  ('threat-hunter', 'Threat Hunter', 'Detect 10 threats across your career.', 'COMBAT', 'COMMON', 150),
  ('firewall-master', 'Firewall Master', 'Successfully block 10 malicious sources.', 'DEFENSE', 'RARE', 250),
  ('zero-damage', 'Zero Damage', 'Complete a mission while maintaining 100% network health.', 'DEFENSE', 'EPIC', 500),
  ('lightning', 'Lightning Response', 'Contain a critical incident in under 10 seconds.', 'SPEED', 'RARE', 300),
  ('network-savior', 'Network Savior', 'Complete a mission involving multiple simultaneous threats.', 'CAMPAIGN', 'EPIC', 500),
  ('incident-commander', 'Incident Commander', 'Complete all five campaign missions.', 'CAMPAIGN', 'LEGENDARY', 1000),
  ('perfect-response', 'Perfect Response', 'No mistakes, no unnecessary isolation, excellent response time, 95%+ health.', 'MASTERY', 'LEGENDARY', 1000)
ON CONFLICT (id) DO NOTHING;
