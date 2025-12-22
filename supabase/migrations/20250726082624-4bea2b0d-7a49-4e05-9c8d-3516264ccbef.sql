-- Fix security issues by setting search_path for all functions

-- Update create_weekly_tournament function with security fixes
CREATE OR REPLACE FUNCTION public.create_weekly_tournament()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week_start DATE;
  current_week_end TIMESTAMPTZ;
  new_tournament_id UUID;
BEGIN
  -- Calculate current week (Monday to Sunday)
  current_week_start := date_trunc('week', CURRENT_DATE);
  current_week_end := (current_week_start + interval '7 days' - interval '1 second');
  
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
      'Weekly Tournament - ' || TO_CHAR(current_week_start, 'Month DD, YYYY'),
      current_week_start::timestamptz,
      current_week_end,
      2.00,
      2500.00,
      1000.00,
      500.00,
      4000.00,
      100,
      0,
      'active',
      now()
    ) RETURNING id INTO new_tournament_id;
  END IF;
END;
$$;

-- Update finalize_tournament function with security fixes
CREATE OR REPLACE FUNCTION public.finalize_tournament(tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tournament_record RECORD;
  winner_record RECORD;
  position_counter INTEGER := 1;
BEGIN
  -- Get tournament details
  SELECT * INTO tournament_record FROM public.tournaments WHERE id = tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Mark tournament as completed
  UPDATE public.tournaments SET status = 'completed' WHERE id = tournament_id;
  
  -- Select top 3 winners based on best score, then distance as tiebreaker
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
    LIMIT 3
  LOOP
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
      position_counter,
      winner_record.best_score,
      winner_record.max_distance,
      CASE position_counter
        WHEN 1 THEN tournament_record.first_prize
        WHEN 2 THEN tournament_record.second_prize
        WHEN 3 THEN tournament_record.third_prize
        ELSE 0
      END,
      tournament_record.name,
      tournament_record.end_date
    );
    
    -- Update user's total winnings
    UPDATE public.profiles 
    SET total_winnings = total_winnings + CASE position_counter
      WHEN 1 THEN tournament_record.first_prize
      WHEN 2 THEN tournament_record.second_prize
      WHEN 3 THEN tournament_record.third_prize
      ELSE 0
    END
    WHERE id = winner_record.profile_id;
    
    position_counter := position_counter + 1;
  END LOOP;
  
  -- Reset all users' tournament_active status for next tournament
  UPDATE public.profiles SET tournament_active = false;
  
  -- Create next week's tournament
  PERFORM public.create_weekly_tournament();
END;
$$;

-- Update can_play_tournament function with security fixes
CREATE OR REPLACE FUNCTION public.can_play_tournament(user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_tournament_id UUID;
  user_paid boolean := false;
BEGIN
  -- Get current active tournament
  SELECT id INTO current_tournament_id 
  FROM public.tournaments 
  WHERE status = 'active' 
  AND end_date > now()
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF current_tournament_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has paid for current tournament
  SELECT EXISTS(
    SELECT 1 FROM public.tournament_participants tp
    WHERE tp.tournament_id = current_tournament_id 
    AND tp.user_id = user_id
    AND tp.payment_status = 'completed'
  ) INTO user_paid;
  
  RETURN user_paid;
END;
$$;

-- Update existing increment_total_spent function with security fixes
CREATE OR REPLACE FUNCTION public.increment_total_spent(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET total_spent = total_spent + amount 
  WHERE id = user_id;
END;
$$;

-- Update existing handle_new_user function with security fixes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;