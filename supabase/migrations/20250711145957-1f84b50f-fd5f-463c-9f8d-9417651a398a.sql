
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  avatar_url TEXT,
  total_coins INTEGER DEFAULT 0,
  total_winnings DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  tournament_active BOOLEAN DEFAULT false,
  premium_access BOOLEAN DEFAULT false,
  premium_purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entry_fee DECIMAL(10,2) DEFAULT 2.00,
  prize_pool DECIMAL(10,2) DEFAULT 0.00,
  first_prize DECIMAL(10,2) DEFAULT 2500.00,
  second_prize DECIMAL(10,2) DEFAULT 1000.00,
  third_prize DECIMAL(10,2) DEFAULT 500.00,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tournament_participants table
CREATE TABLE public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  best_score INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  UNIQUE(tournament_id, user_id)
);

-- Create game_scores table
CREATE TABLE public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  coins_collected INTEGER DEFAULT 0,
  game_mode TEXT CHECK (game_mode IN ('free', 'tournament')) NOT NULL,
  game_duration INTEGER, -- in seconds
  obstacles_avoided INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for tournaments (public read, admin write)
CREATE POLICY "Anyone can view tournaments" ON public.tournaments
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for tournament_participants
CREATE POLICY "Users can view their own participation" ON public.tournament_participants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all participants for leaderboard" ON public.tournament_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own participation" ON public.tournament_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON public.tournament_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for game_scores
CREATE POLICY "Users can view their own scores" ON public.game_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all tournament scores for leaderboard" ON public.game_scores
  FOR SELECT TO authenticated USING (game_mode = 'tournament');

CREATE POLICY "Users can insert their own scores" ON public.game_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create current tournament view
CREATE OR REPLACE VIEW public.current_tournament AS
SELECT * FROM public.tournaments 
WHERE status = 'active' AND start_date <= now() AND end_date >= now()
ORDER BY start_date DESC
LIMIT 1;

-- Create tournament leaderboard view
CREATE OR REPLACE VIEW public.tournament_leaderboard AS
SELECT 
  tp.tournament_id,
  tp.user_id,
  p.username,
  p.full_name,
  tp.best_score,
  tp.total_games,
  ROW_NUMBER() OVER (PARTITION BY tp.tournament_id ORDER BY tp.best_score DESC, tp.joined_at ASC) as rank
FROM public.tournament_participants tp
JOIN public.profiles p ON tp.profile_id = p.id
ORDER BY tp.tournament_id, rank;

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

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ language plpgsql security definer;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert initial weekly tournament
INSERT INTO public.tournaments (
  name,
  entry_fee,
  first_prize,
  second_prize,
  third_prize,
  start_date,
  end_date,
  status,
  max_participants
) VALUES (
  'Weekly Sky Runner Tournament',
  2.00,
  2500.00,
  1000.00,
  500.00,
  date_trunc('week', now()) + interval '1 week',
  date_trunc('week', now()) + interval '2 weeks' - interval '1 second',
  'active',
  1000
);

-- Enable realtime for live leaderboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
