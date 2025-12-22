-- Remove SECURITY DEFINER from request_withdrawal function as it should respect user permissions
-- This function allows users to request withdrawals of their own funds

CREATE OR REPLACE FUNCTION public.request_withdrawal(user_id uuid, amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  user_winnings NUMERIC;
  withdrawal_id UUID;
  user_profile_id UUID;
BEGIN
  -- Verify the user is requesting withdrawal for themselves
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Access denied: Cannot request withdrawal for another user';
  END IF;

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