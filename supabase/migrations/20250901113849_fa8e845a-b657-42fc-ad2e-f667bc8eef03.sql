-- Update tournaments table for weekly tournaments
ALTER TABLE public.tournaments ALTER COLUMN name TYPE TEXT;
ALTER TABLE public.tournaments ALTER COLUMN first_prize SET DEFAULT 200.00;
ALTER TABLE public.tournaments ALTER COLUMN second_prize SET DEFAULT 0.00;
ALTER TABLE public.tournaments ALTER COLUMN third_prize SET DEFAULT 0.00;
ALTER TABLE public.tournaments ALTER COLUMN prize_pool SET DEFAULT 200.00;

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

-- Update finalize_tournament function for new logic
CREATE OR REPLACE FUNCTION public.finalize_tournament(tournament_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  tournament_record RECORD;
  winner_record RECORD;
  winner_count INTEGER := 0;
BEGIN
  -- Get tournament details
  SELECT * INTO tournament_record FROM public.tournaments WHERE id = tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Mark tournament as completed
  UPDATE public.tournaments SET status = 'completed' WHERE id = tournament_id;
  
  -- Select winner (participant with highest score)
  FOR winner_record IN
    SELECT 
      tp.user_id,
      tp.profile_id,
      p.username,
      p.full_name,
      tp.best_score,
      COALESCE(MAX(gs.distance_covered), 0) as max_distance
    FROM public.tournament_participants tp
    JOIN public.profiles p ON p.id = tp.profile_id
    LEFT JOIN public.game_scores gs ON gs.user_id = tp.user_id 
      AND gs.tournament_id = tournament_id 
      AND gs.game_mode = 'tournament'
    WHERE tp.tournament_id = tournament_id
      AND tp.payment_status = 'completed'
    GROUP BY tp.user_id, tp.profile_id, p.username, p.full_name, tp.best_score
    ORDER BY tp.best_score DESC, max_distance DESC
    LIMIT 1
  LOOP
    winner_count := winner_count + 1;
    
    -- Insert winner record
    INSERT INTO public.tournament_winners (
      tournament_id,
      user_id,
      profile_id,
      username,
      full_name,
      position,
      final_score,
      total_distance,
      prize_amount,
      tournament_name,
      tournament_end_date
    ) VALUES (
      tournament_id,
      winner_record.user_id,
      winner_record.profile_id,
      winner_record.username,
      winner_record.full_name,
      1,
      winner_record.best_score,
      winner_record.max_distance,
      200.00,
      tournament_record.name,
      tournament_record.end_date
    );
    
    -- Update user's total winnings
    UPDATE public.profiles 
    SET total_winnings = total_winnings + 200.00
    WHERE id = winner_record.profile_id;
    
    -- Add to earnings history
    INSERT INTO public.earnings_history (
      user_id,
      profile_id,
      tournament_id,
      amount,
      type,
      description
    ) VALUES (
      winner_record.user_id,
      winner_record.profile_id,
      tournament_id,
      200.00,
      'win',
      'Winner of tournament: ' || tournament_record.name
    );
  END LOOP;
  
  -- Reset all users' tournament_active status for next tournament
  UPDATE public.profiles SET tournament_active = false;
  
  -- Create next week's tournament
  PERFORM public.create_weekly_tournament();
END;
$function$;

-- Update create_weekly_tournament function for proper weekly naming
CREATE OR REPLACE FUNCTION public.create_weekly_tournament()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_week_start DATE;
  current_week_end TIMESTAMPTZ;
  week_number INTEGER;
  month_name TEXT;
  year_number INTEGER;
  tournament_name TEXT;
BEGIN
  -- Calculate current week (Monday to Sunday)
  current_week_start := date_trunc('week', CURRENT_DATE);
  current_week_end := (current_week_start + interval '6 days 23 hours 58 minutes');
  
  -- Calculate week number of the month
  week_number := EXTRACT(DAY FROM current_week_start)::INTEGER / 7 + 1;
  month_name := TO_CHAR(current_week_start, 'Mon');
  year_number := EXTRACT(YEAR FROM current_week_start)::INTEGER;
  
  -- Create tournament name
  tournament_name := week_number || CASE 
    WHEN week_number = 1 THEN 'st'
    WHEN week_number = 2 THEN 'nd' 
    WHEN week_number = 3 THEN 'rd'
    ELSE 'th'
  END || ' week of ' || month_name || ' ' || year_number;
  
  -- Check if tournament already exists for this week
  IF NOT EXISTS (
    SELECT 1 FROM public.tournaments 
    WHERE start_date::date = current_week_start 
    AND status = 'active'
  ) THEN
    -- Create new tournament
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
      tournament_name,
      current_week_start::timestamptz,
      current_week_end,
      2.00,
      200.00,
      0.00,
      0.00,
      200.00,
      1000,
      0,
      'active',
      now()
    );
  END IF;
END;
$function$;

-- Create function to handle withdrawal requests
CREATE OR REPLACE FUNCTION public.request_withdrawal(user_id uuid, amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_winnings NUMERIC;
  withdrawal_id UUID;
  user_profile_id UUID;
BEGIN
  -- Get user's profile id and current winnings
  SELECT id, total_winnings INTO user_profile_id, user_winnings 
  FROM public.profiles 
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Check if user has enough winnings
  IF user_winnings < amount THEN
    RAISE EXCEPTION 'Insufficient winnings balance';
  END IF;
  
  -- Check minimum withdrawal amount
  IF amount < 10.00 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is $10';
  END IF;
  
  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id,
    profile_id,
    amount,
    status
  ) VALUES (
    user_id,
    user_profile_id,
    amount,
    'pending'
  ) RETURNING id INTO withdrawal_id;
  
  RETURN withdrawal_id;
END;
$function$;