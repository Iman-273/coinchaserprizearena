-- Add missing columns to game_scores table
ALTER TABLE public.game_scores 
ADD COLUMN IF NOT EXISTS coins_collected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS game_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS distance_covered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS obstacles_avoided INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'free_play',
ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;

-- Create tournament_winners table
CREATE TABLE IF NOT EXISTS public.tournament_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  position INTEGER NOT NULL,
  final_score INTEGER NOT NULL,
  final_distance INTEGER DEFAULT 0,
  prize_amount DECIMAL(10,2) DEFAULT 0,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tournament_winners
ALTER TABLE public.tournament_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tournament_winners
CREATE POLICY "Anyone can view tournament winners" ON public.tournament_winners FOR SELECT USING (true);

-- Add missing column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tournament_active BOOLEAN DEFAULT FALSE;

-- Create can_play_tournament RPC function
CREATE OR REPLACE FUNCTION public.can_play_tournament(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_spent DECIMAL;
BEGIN
  SELECT total_spent INTO user_spent
  FROM public.profiles
  WHERE id = user_id;

  -- User can play if they have spent at least $99
  RETURN COALESCE(user_spent, 0) >= 99;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;