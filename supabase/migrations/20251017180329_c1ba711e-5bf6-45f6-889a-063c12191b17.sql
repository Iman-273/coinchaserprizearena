-- Create an active tournament
INSERT INTO public.tournaments (
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
  'Weekly Championship',
  NOW() + INTERVAL '5 days',
  15,
  500.00,
  250.00,
  100.00,
  25.00,
  100,
  'active'
);