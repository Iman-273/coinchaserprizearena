-- Function to force activate current tournament for testing
CREATE OR REPLACE FUNCTION public.force_activate_current_tournament()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the most recent UPCOMING tournament to ACTIVE with current dates
  UPDATE tournaments
  SET 
    state = 'ACTIVE',
    start_at = NOW() AT TIME ZONE 'Asia/Karachi',
    join_start_at = NOW() AT TIME ZONE 'Asia/Karachi',
    join_end_at = (NOW() AT TIME ZONE 'Asia/Karachi') + INTERVAL '4 days',
    end_date = (NOW() AT TIME ZONE 'Asia/Karachi') + INTERVAL '7 days'
  WHERE state = 'UPCOMING'
    AND id = (
      SELECT id FROM tournaments 
      WHERE state = 'UPCOMING' 
      ORDER BY created_at DESC 
      LIMIT 1
    );
END;
$function$;