
-- Add two test users to the profiles table with premium access and tournament participation
INSERT INTO public.profiles (
  id, 
  username, 
  email, 
  full_name, 
  premium_access, 
  premium_purchased_at, 
  tournament_active, 
  total_coins, 
  total_winnings, 
  total_spent, 
  created_at, 
  updated_at
) VALUES 
  (
    gen_random_uuid(),
    'testuser1',
    'testuser1@example.com',
    'Test User One',
    true,
    now(),
    true,
    150,
    0.00,
    101.00,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'testuser2', 
    'testuser2@example.com',
    'Test User Two',
    true,
    now(),
    true,
    200,
    0.00,
    101.00,
    now(),
    now()
  );

-- Get the current active tournament and add test participants
WITH current_tournament_data AS (
  SELECT id FROM public.tournaments 
  WHERE status = 'active' 
  ORDER BY start_date DESC 
  LIMIT 1
),
test_users AS (
  SELECT id, username FROM public.profiles 
  WHERE email IN ('testuser1@example.com', 'testuser2@example.com')
)
INSERT INTO public.tournament_participants (
  tournament_id, 
  user_id, 
  profile_id, 
  joined_at, 
  payment_status,
  best_score,
  total_games
)
SELECT 
  t.id,
  u.id,
  u.id,
  now(),
  'completed',
  CASE 
    WHEN u.username = 'testuser1' THEN 2500
    WHEN u.username = 'testuser2' THEN 1800
    ELSE 0
  END,
  CASE 
    WHEN u.username = 'testuser1' THEN 5
    WHEN u.username = 'testuser2' THEN 3
    ELSE 0
  END
FROM current_tournament_data t, test_users u
ON CONFLICT (tournament_id, user_id) DO UPDATE SET
  best_score = EXCLUDED.best_score,
  total_games = EXCLUDED.total_games,
  payment_status = 'completed';

-- Add some sample game scores for the test users with distance tracking
WITH current_tournament_data AS (
  SELECT id FROM public.tournaments 
  WHERE status = 'active' 
  ORDER BY start_date DESC 
  LIMIT 1
),
test_users AS (
  SELECT id, username FROM public.profiles 
  WHERE email IN ('testuser1@example.com', 'testuser2@example.com')
)
INSERT INTO public.game_scores (
  user_id,
  profile_id,
  tournament_id,
  score,
  coins_collected,
  game_duration,
  obstacles_avoided,
  game_mode,
  created_at
)
SELECT 
  u.id,
  u.id,
  t.id,
  CASE 
    WHEN u.username = 'testuser1' THEN generate_series.score
    WHEN u.username = 'testuser2' THEN generate_series.score - 300
  END,
  CASE 
    WHEN u.username = 'testuser1' THEN (generate_series.score / 100)
    WHEN u.username = 'testuser2' THEN (generate_series.score / 120)
  END,
  CASE 
    WHEN u.username = 'testuser1' THEN (generate_series.score / 10)
    WHEN u.username = 'testuser2' THEN (generate_series.score / 12)
  END,
  CASE 
    WHEN u.username = 'testuser1' THEN (generate_series.score / 50)
    WHEN u.username = 'testuser2' THEN (generate_series.score / 60)
  END,
  'tournament',
  now() - (generate_series.game_num || ' hours')::interval
FROM current_tournament_data t, 
     test_users u,
     (VALUES 
       (1, 2500),
       (2, 2200), 
       (3, 1900),
       (4, 1600),
       (5, 1800)
     ) AS generate_series(game_num, score);

-- Add a distance_covered column to game_scores table to track distance
ALTER TABLE public.game_scores 
ADD COLUMN IF NOT EXISTS distance_covered INTEGER DEFAULT 0;

-- Update existing game scores with calculated distance based on score
UPDATE public.game_scores 
SET distance_covered = GREATEST(score / 10, 100)
WHERE distance_covered = 0;

-- Update the tournament leaderboard view to include distance
CREATE OR REPLACE VIEW public.tournament_leaderboard AS
SELECT 
  ROW_NUMBER() OVER (
    PARTITION BY tp.tournament_id 
    ORDER BY tp.best_score DESC, MAX(gs.distance_covered) DESC
  ) as rank,
  tp.tournament_id,
  tp.user_id,
  p.username,
  p.full_name,
  tp.best_score,
  tp.total_games,
  MAX(gs.distance_covered) as max_distance_covered,
  SUM(gs.distance_covered) as total_distance_covered
FROM public.tournament_participants tp
JOIN public.profiles p ON tp.user_id = p.id
LEFT JOIN public.game_scores gs ON tp.user_id = gs.user_id 
  AND tp.tournament_id = gs.tournament_id 
  AND gs.game_mode = 'tournament'
WHERE tp.payment_status = 'completed'
GROUP BY tp.tournament_id, tp.user_id, p.username, p.full_name, tp.best_score, tp.total_games
ORDER BY rank;
