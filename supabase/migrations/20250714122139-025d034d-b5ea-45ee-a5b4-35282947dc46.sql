
-- Update the user profile to have premium access and be tournament active
UPDATE public.profiles 
SET 
  premium_access = true,
  premium_purchased_at = now(),
  tournament_active = true,
  updated_at = now()
WHERE email = 'seharn314@gmail.com';

-- If the profile doesn't exist, let's also make sure to handle that case
INSERT INTO public.profiles (id, username, email, full_name, premium_access, premium_purchased_at, tournament_active, total_coins, total_winnings, total_spent, created_at, updated_at)
SELECT 
  auth.users.id,
  COALESCE(auth.users.raw_user_meta_data->>'username', split_part('seharn314@gmail.com', '@', 1)),
  'seharn314@gmail.com',
  COALESCE(auth.users.raw_user_meta_data->>'full_name', split_part('seharn314@gmail.com', '@', 1)),
  true,
  now(),
  true,
  0,
  0.00,
  0.00,
  now(),
  now()
FROM auth.users 
WHERE auth.users.email = 'seharn314@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  premium_access = true,
  premium_purchased_at = now(),
  tournament_active = true,
  updated_at = now();

-- Get the current active tournament
WITH current_tournament_data AS (
  SELECT id FROM public.tournaments 
  WHERE status = 'active' 
  AND start_date <= now() 
  AND end_date >= now()
  ORDER BY start_date DESC 
  LIMIT 1
),
user_data AS (
  SELECT id FROM auth.users WHERE email = 'seharn314@gmail.com'
)
-- Add the user to the current tournament as a participant
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
  0,
  0
FROM current_tournament_data t, user_data u
ON CONFLICT (tournament_id, user_id) DO UPDATE SET
  payment_status = 'completed',
  joined_at = now();
