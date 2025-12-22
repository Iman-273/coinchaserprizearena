-- Fix security definer view issue by removing SECURITY DEFINER from can_play_tournament function
-- This function only reads data and doesn't need elevated privileges

CREATE OR REPLACE FUNCTION public.can_play_tournament(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
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
$function$;