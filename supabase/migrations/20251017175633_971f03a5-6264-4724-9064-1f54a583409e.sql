-- Fix search_path security issues for functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.request_withdrawal(user_id UUID, amount DECIMAL)
RETURNS UUID AS $$
DECLARE
  withdrawal_id UUID;
  user_balance DECIMAL;
BEGIN
  SELECT total_winnings INTO user_balance
  FROM public.profiles
  WHERE id = user_id;

  IF user_balance < amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  IF amount < 10 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is $10';
  END IF;

  INSERT INTO public.withdrawal_requests (user_id, profile_id, amount, status)
  VALUES (user_id, user_id, amount, 'pending')
  RETURNING id INTO withdrawal_id;

  RETURN withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;