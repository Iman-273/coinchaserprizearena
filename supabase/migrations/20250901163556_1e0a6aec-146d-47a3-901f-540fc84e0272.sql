-- Drop the current_tournament view temporarily
DROP VIEW IF EXISTS public.current_tournament;

-- Update tournaments table for weekly tournaments
ALTER TABLE public.tournaments ALTER COLUMN name TYPE TEXT;
ALTER TABLE public.tournaments ALTER COLUMN first_prize SET DEFAULT 200.00;
ALTER TABLE public.tournaments ALTER COLUMN second_prize SET DEFAULT 0.00;
ALTER TABLE public.tournaments ALTER COLUMN third_prize SET DEFAULT 0.00;
ALTER TABLE public.tournaments ALTER COLUMN prize_pool SET DEFAULT 200.00;

-- Recreate the current_tournament view
CREATE VIEW public.current_tournament AS
SELECT 
  id,
  entry_fee,
  prize_pool,
  first_prize,
  second_prize,
  third_prize,
  start_date,
  end_date,
  max_participants,
  current_participants,
  created_at,
  status,
  name
FROM public.tournaments
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 1;

-- Create withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  stripe_transfer_id TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policies for withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create earnings history table
CREATE TABLE public.earnings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL, -- win, withdrawal
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.earnings_history ENABLE ROW LEVEL SECURITY;

-- Policies for earnings history
CREATE POLICY "Users can view their own earnings history" 
ON public.earnings_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert earnings history" 
ON public.earnings_history 
FOR INSERT 
WITH CHECK (true);