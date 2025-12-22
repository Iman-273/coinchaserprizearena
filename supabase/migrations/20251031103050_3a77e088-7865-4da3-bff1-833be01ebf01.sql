-- Create tournament state enum
CREATE TYPE public.tournament_state AS ENUM ('UPCOMING', 'ACTIVE', 'LOCKING', 'PAID_OUT', 'ARCHIVED');

-- Alter tournaments table
ALTER TABLE public.tournaments
  ADD COLUMN week_key TEXT,
  ADD COLUMN state tournament_state DEFAULT 'UPCOMING',
  ADD COLUMN start_at TIMESTAMPTZ,
  ADD COLUMN join_start_at TIMESTAMPTZ,
  ADD COLUMN join_end_at TIMESTAMPTZ,
  ADD COLUMN leaderboard_last_recalc_at TIMESTAMPTZ,
  ADD COLUMN winners JSONB DEFAULT '{"first":null,"second":null,"third":null}'::jsonb,
  ALTER COLUMN first_prize SET DEFAULT 150,
  ALTER COLUMN second_prize SET DEFAULT 100,
  ALTER COLUMN third_prize SET DEFAULT 50,
  DROP COLUMN IF EXISTS current_participants;

-- Update existing tournaments to have proper values
UPDATE public.tournaments 
SET 
  week_key = TO_CHAR(end_date, 'IYYY-IW'),
  state = CASE 
    WHEN status = 'completed' THEN 'PAID_OUT'::tournament_state
    WHEN end_date < NOW() THEN 'PAID_OUT'::tournament_state
    ELSE 'ACTIVE'::tournament_state
  END,
  start_at = end_date - INTERVAL '6 days 23 hours 59 minutes 59 seconds',
  join_start_at = end_date - INTERVAL '6 days 23 hours 59 minutes 59 seconds',
  join_end_at = end_date - INTERVAL '3 days'
WHERE week_key IS NULL;

-- Create unique constraint for active tournaments (excluding LOCKING which is temporary)
CREATE UNIQUE INDEX unique_active_tournament ON public.tournaments (state) 
WHERE state IN ('UPCOMING', 'ACTIVE');

-- Alter tournament_participants - add new columns first
ALTER TABLE public.tournament_participants
  ADD COLUMN entry_payment_id TEXT,
  ADD COLUMN games_played INTEGER DEFAULT 0,
  ADD COLUMN finish_time TIMESTAMPTZ,
  ADD COLUMN last_agg_at TIMESTAMPTZ;

-- Rename column separately
ALTER TABLE public.tournament_participants
  RENAME COLUMN best_score TO total_runs;

-- Alter profiles table for earnings
ALTER TABLE public.profiles
  ADD COLUMN earnings_balance_usd NUMERIC DEFAULT 0,
  ADD COLUMN earnings_history JSONB DEFAULT '[]'::jsonb;

-- Create index for game scores aggregation
CREATE INDEX idx_game_scores_tournament_user_time ON public.game_scores (tournament_id, user_id, created_at);

-- Function: can_join_tournament
CREATE OR REPLACE FUNCTION public.can_join_tournament(p_tournament_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_now TIMESTAMPTZ;
BEGIN
  v_now := NOW() AT TIME ZONE 'Asia/Karachi';
  
  SELECT * INTO v_tournament 
  FROM tournaments 
  WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF v_tournament.state != 'ACTIVE' THEN
    RETURN FALSE;
  END IF;
  
  IF v_now < v_tournament.join_start_at OR v_now > v_tournament.join_end_at THEN
    RETURN FALSE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM tournament_participants 
    WHERE tournament_id = p_tournament_id AND user_id = p_user_id
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function: recompute_leaderboard
CREATE OR REPLACE FUNCTION public.recompute_leaderboard(p_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
  v_total_runs INTEGER;
  v_games_played INTEGER;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND OR v_tournament.state NOT IN ('ACTIVE', 'LOCKING') THEN
    RETURN;
  END IF;
  
  FOR v_participant IN 
    SELECT * FROM tournament_participants WHERE tournament_id = p_tournament_id
  LOOP
    SELECT 
      COALESCE(SUM(score), 0),
      COUNT(*)
    INTO v_total_runs, v_games_played
    FROM game_scores
    WHERE user_id = v_participant.user_id
      AND tournament_id = p_tournament_id
      AND created_at BETWEEN v_tournament.start_at AND COALESCE(v_tournament.end_date, NOW());
    
    UPDATE tournament_participants
    SET 
      total_runs = v_total_runs,
      games_played = v_games_played,
      last_agg_at = NOW()
    WHERE id = v_participant.id;
  END LOOP;
  
  UPDATE tournaments
  SET leaderboard_last_recalc_at = NOW()
  WHERE id = p_tournament_id;
END;
$$;

-- Function: finalize_tournament
CREATE OR REPLACE FUNCTION public.finalize_tournament(p_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_winner RECORD;
  v_position INTEGER := 0;
  v_prizes NUMERIC[] := ARRAY[150, 100, 50];
  v_winners_json JSONB := '{"first":null,"second":null,"third":null}'::jsonb;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  UPDATE tournaments SET state = 'LOCKING' WHERE id = p_tournament_id;
  
  PERFORM recompute_leaderboard(p_tournament_id);
  
  FOR v_winner IN
    SELECT 
      tp.user_id,
      tp.profile_id,
      tp.total_runs,
      tp.games_played,
      tp.joined_at,
      p.username,
      p.full_name
    FROM tournament_participants tp
    JOIN profiles p ON tp.user_id = p.id
    WHERE tp.tournament_id = p_tournament_id
    ORDER BY 
      tp.total_runs DESC,
      tp.games_played ASC,
      tp.joined_at ASC,
      tp.user_id ASC
    LIMIT 3
  LOOP
    v_position := v_position + 1;
    
    DECLARE
      v_prize NUMERIC := v_prizes[v_position];
      v_place_key TEXT;
    BEGIN
      v_place_key := CASE v_position
        WHEN 1 THEN 'first'
        WHEN 2 THEN 'second'
        WHEN 3 THEN 'third'
      END;
      
      v_winners_json := jsonb_set(
        v_winners_json,
        ARRAY[v_place_key],
        jsonb_build_object(
          'user_id', v_winner.user_id,
          'runs', v_winner.total_runs,
          'prize_usd', v_prize
        )
      );
      
      INSERT INTO tournament_winners (
        tournament_id,
        user_id,
        profile_id,
        position,
        final_score,
        final_distance,
        prize_amount,
        username,
        full_name
      )
      VALUES (
        p_tournament_id,
        v_winner.user_id,
        v_winner.profile_id,
        v_position,
        v_winner.total_runs,
        0,
        v_prize,
        v_winner.username,
        v_winner.full_name
      );
      
      UPDATE profiles
      SET 
        earnings_balance_usd = earnings_balance_usd + v_prize,
        earnings_history = jsonb_insert(
          COALESCE(earnings_history, '[]'::jsonb),
          '{0}',
          jsonb_build_object(
            'at', NOW(),
            'type', 'TOURNAMENT_PRIZE',
            'tournament_id', p_tournament_id,
            'week_key', v_tournament.week_key,
            'place', v_position,
            'amount_usd', v_prize,
            'note', 'Weekly tournament prize'
          )
        ),
        total_winnings = total_winnings + v_prize
      WHERE id = v_winner.user_id;
    END;
  END LOOP;
  
  UPDATE tournaments
  SET 
    winners = v_winners_json,
    state = 'PAID_OUT',
    status = 'completed'
  WHERE id = p_tournament_id;
END;
$$;

-- Function: create_weekly_tournament
CREATE OR REPLACE FUNCTION public.create_weekly_tournament()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id UUID;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_join_end_at TIMESTAMPTZ;
  v_week_key TEXT;
  v_now_pkt TIMESTAMPTZ;
BEGIN
  v_now_pkt := NOW() AT TIME ZONE 'Asia/Karachi';
  
  IF EXISTS (SELECT 1 FROM tournaments WHERE state IN ('UPCOMING', 'ACTIVE')) THEN
    RETURN NULL;
  END IF;
  
  v_start_at := DATE_TRUNC('week', v_now_pkt + INTERVAL '1 week') AT TIME ZONE 'Asia/Karachi';
  v_end_at := v_start_at + INTERVAL '6 days 23 hours 59 minutes 59 seconds';
  v_join_end_at := v_start_at + INTERVAL '3 days 23 hours 59 minutes 59 seconds';
  v_week_key := TO_CHAR(v_start_at, 'IYYY-IW');
  
  INSERT INTO tournaments (
    name,
    week_key,
    state,
    start_at,
    end_date,
    join_start_at,
    join_end_at,
    first_prize,
    second_prize,
    third_prize,
    entry_fee,
    max_participants,
    status
  )
  VALUES (
    'Weekly Tournament ' || v_week_key,
    v_week_key,
    'UPCOMING',
    v_start_at,
    v_end_at,
    v_start_at,
    v_join_end_at,
    150,
    100,
    50,
    2,
    10000,
    'active'
  )
  RETURNING id INTO v_tournament_id;
  
  RETURN v_tournament_id;
END;
$$;

-- Function: activate_tournament
CREATE OR REPLACE FUNCTION public.activate_tournament()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_pkt TIMESTAMPTZ;
BEGIN
  v_now_pkt := NOW() AT TIME ZONE 'Asia/Karachi';
  
  UPDATE tournaments
  SET state = 'ACTIVE'
  WHERE state = 'UPCOMING'
    AND start_at <= v_now_pkt;
END;
$$;