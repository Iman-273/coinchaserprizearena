-- Update the user's profile to activate tournament access
UPDATE public.profiles 
SET tournament_active = true 
WHERE id = 'e298b10f-4370-4ec0-b8b1-6f206d6ed08f';