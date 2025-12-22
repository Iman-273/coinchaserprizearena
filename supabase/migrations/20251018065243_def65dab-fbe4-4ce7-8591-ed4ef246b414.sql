-- Create a new active tournament
INSERT INTO public.tournaments (
  id,
  name,
  end_date,
  current_participants,
  first_prize,
  second_prize,
  third_prize,
  entry_fee,
  max_participants,
  status
) VALUES (
  gen_random_uuid(),
  'Test Tournament',
  NOW() + INTERVAL '7 days',
  1,
  100,
  50,
  25,
  0,
  100,
  'active'
);

-- Join the user to the tournament
INSERT INTO public.tournament_participants (
  tournament_id,
  user_id,
  profile_id,
  best_score,
  total_games
)
SELECT 
  t.id,
  'e298b10f-4370-4ec0-b8b1-6f206d6ed08f'::uuid,
  'e298b10f-4370-4ec0-b8b1-6f206d6ed08f'::uuid,
  0,
  0
FROM public.tournaments t
WHERE t.name = 'Test Tournament' AND t.status = 'active'
LIMIT 1;