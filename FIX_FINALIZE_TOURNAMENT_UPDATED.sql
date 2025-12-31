-- ========================================
-- FIX: finalize_tournament to handle 1-3 winners
-- ========================================
-- Updated function that creates winners based on actual participants
-- 1 participant → 1 winner (position 1)
-- 2 participants → 2 winners (position 1, 2)
-- 3+ participants → 3 winners (position 1, 2, 3)

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
  v_participant_count INTEGER := 0;
  v_place_key TEXT;
  v_prize NUMERIC;
BEGIN
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  UPDATE tournaments SET state = 'LOCKING' WHERE id = p_tournament_id;
  
  PERFORM recompute_leaderboard(p_tournament_id);
  
  -- Count actual participants
  SELECT COUNT(*) INTO v_participant_count 
  FROM tournament_participants 
  WHERE tournament_id = p_tournament_id;
  
  -- Limit to top 3 (or fewer if less participants)
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
    LIMIT LEAST(3, v_participant_count)
  LOOP
    v_position := v_position + 1;
    
    -- Get prize for this position
    v_prize := v_prizes[v_position];
    
    -- Get place key
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
  END LOOP;
  
  UPDATE tournaments
  SET 
    winners = v_winners_json,
    state = 'PAID_OUT',
    status = 'completed'
  WHERE id = p_tournament_id;
END;
$$;

-- ========================================
-- Key Changes:
-- ========================================
-- 1. Added v_participant_count to count actual participants
-- 2. Moved v_place_key and v_prize to main DECLARE section
-- 3. Removed nested DECLARE/BEGIN/END block
-- 4. Changed LIMIT 3 to LIMIT LEAST(3, v_participant_count)
-- 
-- Result:
-- - 1 participant → 1 winner with £150
-- - 2 participants → 2 winners with £150, £100
-- - 3+ participants → 3 winners with £150, £100, £50
