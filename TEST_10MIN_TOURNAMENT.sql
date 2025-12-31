-- ========================================
-- CREATE A 10-MINUTE TEST TOURNAMENT
-- ========================================

-- Insert a new 10-minute tournament
-- start_at = NOW
-- end_date = NOW + 10 minutes

INSERT INTO tournaments (
  name,
  week_key,
  state,
  start_at,
  end_date,
  join_start_at,
  join_end_at,
  first_prize,
  second_prize,
  third_prize,
  created_at
) VALUES (
  '10-Minute Test Tournament',
  'test-10min-' || to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  'ACTIVE',
  NOW(),
  NOW() + INTERVAL '10 minutes',
  NOW(),
  NOW() + INTERVAL '5 minutes 30 seconds',
  150.00,
  100.00,
  50.00,
  NOW()
)
RETURNING id, name, start_at, end_date;

-- ========================================
-- NOTES:
-- ========================================
-- 1. Tournament is ACTIVE immediately
-- 2. Join window: 5.5 minutes (first half)
-- 3. Play window: Full 10 minutes
-- 4. After 10 minutes, finalize_tournament job will run
-- 5. Winners are calculated and announced automatically
-- 6. Check tournament_winners table after 10 minutes
-- 7. Users will see in-game toast notification
-- 8. Profile total_winnings updated automatically

-- To check active tournaments:
-- SELECT id, name, state, start_at, end_date FROM tournaments WHERE state = 'ACTIVE' ORDER BY start_at DESC;

-- To check tournament winners after it ends:
-- SELECT * FROM tournament_winners WHERE tournament_id = '<id-from-above>' ORDER BY position;

-- To check if profile winnings were updated:
-- SELECT id, username, total_winnings FROM profiles WHERE id IN (
--   SELECT user_id FROM tournament_winners
-- );
