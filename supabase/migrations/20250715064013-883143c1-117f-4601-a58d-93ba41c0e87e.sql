
-- First, let's create a comprehensive tournament for testing
INSERT INTO public.tournaments (
  id,
  name,
  start_date,
  end_date,
  entry_fee,
  first_prize,
  second_prize,
  third_prize,
  prize_pool,
  max_participants,
  current_participants,
  status,
  created_at
) VALUES (
  gen_random_uuid(),
  'Weekly Championship - January 2025',
  now() - interval '2 days',
  now() + interval '5 days',
  5.00,
  5000.00,
  2500.00,
  1000.00,
  8500.00,
  50,
  12,
  'active',
  now() - interval '3 days'
);

-- Create diverse test user profiles
INSERT INTO public.profiles (
  id,
  username,
  email,
  full_name,
  total_coins,
  total_winnings,
  total_spent,
  tournament_active,
  premium_access,
  premium_purchased_at,
  created_at,
  updated_at
) VALUES 
  (
    gen_random_uuid(),
    'speedrunner_pro',
    'speedrunner@example.com',
    'Alex Johnson',
    2500,
    1250.00,
    275.00,
    true,
    true,
    now() - interval '30 days',
    now() - interval '45 days',
    now()
  ),
  (
    gen_random_uuid(),
    'skymaster_99',
    'skymaster@example.com',
    'Sarah Chen',
    1800,
    850.00,
    195.00,
    true,
    true,
    now() - interval '20 days',
    now() - interval '35 days',
    now()
  ),
  (
    gen_random_uuid(),
    'coin_collector',
    'collector@example.com',
    'Mike Rodriguez',
    3200,
    0.00,
    125.00,
    true,
    false,
    null,
    now() - interval '25 days',
    now()
  ),
  (
    gen_random_uuid(),
    'distance_king',
    'distance@example.com',
    'Emma Thompson',
    1450,
    500.00,
    85.00,
    true,
    true,
    now() - interval '15 days',
    now() - interval '20 days',
    now()
  ),
  (
    gen_random_uuid(),
    'rookie_player',
    'rookie@example.com',
    'James Wilson',
    150,
    0.00,
    25.00,
    true,
    false,
    null,
    now() - interval '5 days',
    now()
  ),
  (
    gen_random_uuid(),
    'veteran_gamer',
    'veteran@example.com',
    'Lisa Park',
    4200,
    2100.00,
    450.00,
    true,
    true,
    now() - interval '60 days',
    now() - interval '75 days',
    now()
  );

-- Add tournament participants with the current active tournament
WITH current_tournament_data AS (
  SELECT id FROM public.tournaments 
  WHERE status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 1
),
demo_users AS (
  SELECT id, username FROM public.profiles 
  WHERE email IN (
    'speedrunner@example.com',
    'skymaster@example.com', 
    'collector@example.com',
    'distance@example.com',
    'rookie@example.com',
    'veteran@example.com'
  )
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
  now() - (CASE 
    WHEN u.username = 'speedrunner_pro' THEN interval '2 days'
    WHEN u.username = 'skymaster_99' THEN interval '1 day 12 hours'
    WHEN u.username = 'coin_collector' THEN interval '1 day 8 hours'
    WHEN u.username = 'distance_king' THEN interval '1 day'
    WHEN u.username = 'rookie_player' THEN interval '18 hours'
    WHEN u.username = 'veteran_gamer' THEN interval '2 days 4 hours'
    ELSE interval '1 day'
  END),
  'completed',
  CASE 
    WHEN u.username = 'speedrunner_pro' THEN 8500
    WHEN u.username = 'skymaster_99' THEN 7200
    WHEN u.username = 'coin_collector' THEN 6800
    WHEN u.username = 'distance_king' THEN 6100
    WHEN u.username = 'rookie_player' THEN 2400
    WHEN u.username = 'veteran_gamer' THEN 9200
    ELSE 1000
  END,
  CASE 
    WHEN u.username = 'speedrunner_pro' THEN 12
    WHEN u.username = 'skymaster_99' THEN 8
    WHEN u.username = 'coin_collector' THEN 15
    WHEN u.username = 'distance_king' THEN 6
    WHEN u.username = 'rookie_player' THEN 3
    WHEN u.username = 'veteran_gamer' THEN 18
    ELSE 5
  END
FROM current_tournament_data t, demo_users u
ON CONFLICT (tournament_id, user_id) DO UPDATE SET
  best_score = EXCLUDED.best_score,
  total_games = EXCLUDED.total_games,
  payment_status = 'completed';

-- Add comprehensive game scores for tournament mode
WITH current_tournament_data AS (
  SELECT id FROM public.tournaments 
  WHERE status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 1
),
demo_users AS (
  SELECT id, username FROM public.profiles 
  WHERE email IN (
    'speedrunner@example.com',
    'skymaster@example.com', 
    'collector@example.com',
    'distance@example.com',
    'rookie@example.com',
    'veteran@example.com'
  )
),
game_data AS (
  SELECT 
    u.id as user_id,
    u.username,
    t.id as tournament_id,
    games.game_num,
    games.score,
    games.coins,
    games.duration,
    games.distance,
    games.obstacles
  FROM demo_users u
  CROSS JOIN current_tournament_data t
  CROSS JOIN (
    -- Multiple games per user with varying performance
    VALUES 
      -- speedrunner_pro games
      (1, 8500, 85, 425, 850, 17),
      (2, 7800, 78, 390, 780, 15),
      (3, 6900, 69, 345, 690, 14),
      (4, 8200, 82, 410, 820, 16),
      (5, 7500, 75, 375, 750, 15),
      
      -- skymaster_99 games  
      (6, 7200, 72, 360, 720, 14),
      (7, 6500, 65, 325, 650, 13),
      (8, 6800, 68, 340, 680, 13),
      
      -- coin_collector games
      (9, 6800, 95, 340, 680, 13),
      (10, 5200, 88, 260, 520, 10),
      (11, 4800, 92, 240, 480, 9),
      (12, 6100, 89, 305, 610, 12),
      
      -- distance_king games
      (13, 6100, 61, 610, 1220, 24),
      (14, 5800, 58, 580, 1160, 23),
      (15, 5500, 55, 550, 1100, 22),
      
      -- rookie_player games
      (16, 2400, 24, 120, 240, 4),
      (17, 1800, 18, 90, 180, 3),
      (18, 2100, 21, 105, 210, 4),
      
      -- veteran_gamer games
      (19, 9200, 92, 460, 920, 18),
      (20, 8800, 88, 440, 880, 17),
      (21, 8400, 84, 420, 840, 16),
      (22, 9000, 90, 450, 900, 18)
  ) AS games(game_num, score, coins, duration, distance, obstacles)
  WHERE 
    (u.username = 'speedrunner_pro' AND games.game_num BETWEEN 1 AND 5) OR
    (u.username = 'skymaster_99' AND games.game_num BETWEEN 6 AND 8) OR
    (u.username = 'coin_collector' AND games.game_num BETWEEN 9 AND 12) OR
    (u.username = 'distance_king' AND games.game_num BETWEEN 13 AND 15) OR
    (u.username = 'rookie_player' AND games.game_num BETWEEN 16 AND 18) OR
    (u.username = 'veteran_gamer' AND games.game_num BETWEEN 19 AND 22)
)
INSERT INTO public.game_scores (
  user_id,
  profile_id,
  tournament_id,
  score,
  coins_collected,
  game_duration,
  distance_covered,
  obstacles_avoided,
  game_mode,
  created_at
)
SELECT 
  gd.user_id,
  gd.user_id,
  gd.tournament_id,
  gd.score,
  gd.coins,
  gd.duration,
  gd.distance,
  gd.obstacles,
  'tournament',
  now() - (random() * interval '2 days')
FROM game_data gd;

-- Add some free play game scores to show variety
WITH demo_users AS (
  SELECT id, username FROM public.profiles 
  WHERE email IN (
    'speedrunner@example.com',
    'skymaster@example.com', 
    'collector@example.com',
    'distance@example.com',
    'rookie@example.com',
    'veteran@example.com'
  )
)
INSERT INTO public.game_scores (
  user_id,
  profile_id,
  tournament_id,
  score,
  coins_collected,
  game_duration,
  distance_covered,
  obstacles_avoided,
  game_mode,
  created_at
)
SELECT 
  u.id,
  u.id,
  null,
  CASE 
    WHEN u.username = 'speedrunner_pro' THEN 4500 + (random() * 2000)::int
    WHEN u.username = 'skymaster_99' THEN 3800 + (random() * 1500)::int
    WHEN u.username = 'coin_collector' THEN 3200 + (random() * 1200)::int
    WHEN u.username = 'distance_king' THEN 3600 + (random() * 1400)::int
    WHEN u.username = 'rookie_player' THEN 800 + (random() * 600)::int
    WHEN u.username = 'veteran_gamer' THEN 5200 + (random() * 2200)::int
    ELSE 1000
  END,
  CASE 
    WHEN u.username = 'coin_collector' THEN 60 + (random() * 40)::int
    ELSE 20 + (random() * 30)::int
  END,
  180 + (random() * 120)::int,
  CASE 
    WHEN u.username = 'distance_king' THEN 800 + (random() * 400)::int
    ELSE 200 + (random() * 300)::int
  END,
  5 + (random() * 15)::int,
  'free_play',
  now() - (random() * interval '5 days')
FROM demo_users u
CROSS JOIN generate_series(1, 3) -- 3 free play games per user
ORDER BY random();

-- Add some payment records for premium users
WITH premium_users AS (
  SELECT id FROM public.profiles 
  WHERE email IN (
    'speedrunner@example.com',
    'skymaster@example.com',
    'distance@example.com',
    'veteran@example.com'
  )
),
current_tournament_data AS (
  SELECT id FROM public.tournaments 
  WHERE status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 1
)
INSERT INTO public.payments (
  user_id,
  tournament_id,
  amount,
  currency,
  status,
  stripe_payment_intent_id,
  created_at,
  updated_at
)
SELECT 
  u.id,
  t.id,
  5.00,
  'usd',
  'completed',
  'pi_demo_' || substr(md5(random()::text), 1, 16),
  now() - interval '2 days',
  now() - interval '2 days'
FROM premium_users u
CROSS JOIN current_tournament_data t;
