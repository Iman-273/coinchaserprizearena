-- Update the create_weekly_tournament function to start tournaments on Monday
-- and calculate end date as the following Sunday at 11:59 PM
CREATE OR REPLACE FUNCTION public.create_weekly_tournament()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tournament_id UUID;
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if there's already an active tournament
  IF EXISTS (SELECT 1 FROM tournaments WHERE status = 'active') THEN
    RETURN NULL;
  END IF;
  
  -- Calculate next Monday as start date
  v_start_date := DATE_TRUNC('week', NOW()) + INTERVAL '1 week'; -- Next Monday
  
  -- Calculate end date as the following Sunday at 11:59:59 PM
  v_end_date := v_start_date + INTERVAL '6 days 23 hours 59 minutes 59 seconds';
  
  -- Create new tournament
  INSERT INTO tournaments (
    name,
    end_date,
    first_prize,
    second_prize,
    third_prize,
    entry_fee,
    max_participants,
    status
  )
  VALUES (
    'Weekly Tournament ' || TO_CHAR(v_start_date, 'YYYY-MM-DD'),
    v_end_date,
    100,
    50,
    25,
    2,
    1000,
    'active'
  )
  RETURNING id INTO v_tournament_id;
  
  RETURN v_tournament_id;
END;
$function$;