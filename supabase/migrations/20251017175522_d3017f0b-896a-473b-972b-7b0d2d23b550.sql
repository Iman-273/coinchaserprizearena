-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  total_coins INTEGER DEFAULT 0,
  total_winnings DECIMAL(10,2) DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  stripe_account_id TEXT,
  bank_account_last4 TEXT,
  bank_setup_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  current_participants INTEGER DEFAULT 0,
  first_prize DECIMAL(10,2) DEFAULT 0,
  second_prize DECIMAL(10,2) DEFAULT 0,
  third_prize DECIMAL(10,2) DEFAULT 0,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  max_participants INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_scores table
CREATE TABLE IF NOT EXISTS public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  score INTEGER NOT NULL,
  coins_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament_participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  best_score INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_transfer_id TEXT,
  bank_account_last4 TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  expected_arrival_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create earnings_history table
CREATE TABLE IF NOT EXISTS public.earnings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for tournaments
CREATE POLICY "Anyone can view active tournaments" ON public.tournaments FOR SELECT USING (true);

-- RLS Policies for game_scores
CREATE POLICY "Users can view their own scores" ON public.game_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scores" ON public.game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tournament_participants
CREATE POLICY "Users can view tournament participants" ON public.tournament_participants FOR SELECT USING (true);
CREATE POLICY "Users can insert their own participation" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON public.tournament_participants FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for earnings_history
CREATE POLICY "Users can view their own earnings" ON public.earnings_history FOR SELECT USING (auth.uid() = user_id);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create RPC function for withdrawal request
CREATE OR REPLACE FUNCTION public.request_withdrawal(user_id UUID, amount DECIMAL)
RETURNS UUID AS $$
DECLARE
  withdrawal_id UUID;
  user_balance DECIMAL;
BEGIN
  -- Get user's current balance
  SELECT total_winnings INTO user_balance
  FROM public.profiles
  WHERE id = user_id;

  -- Check if user has enough balance
  IF user_balance < amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Check minimum withdrawal amount
  IF amount < 10 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is $10';
  END IF;

  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (user_id, profile_id, amount, status)
  VALUES (user_id, user_id, amount, 'pending')
  RETURNING id INTO withdrawal_id;

  RETURN withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;