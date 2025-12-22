-- Update test account to be a paid account
UPDATE public.profiles
SET 
  total_spent = 99.00,
  updated_at = NOW()
WHERE email = 'seharn314@gmail.com';