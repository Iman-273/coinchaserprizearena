
-- Add premium access fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS premium_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_purchased_at TIMESTAMPTZ;

-- Create or replace function to increment total spent
CREATE OR REPLACE FUNCTION increment_total_spent(user_id UUID, amount DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET total_spent = total_spent + amount 
  WHERE id = user_id;
END;
$$;
