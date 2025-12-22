-- Update tournament prizes to new structure
UPDATE tournaments 
SET 
  first_prize = 100,
  second_prize = 50,
  third_prize = 25
WHERE status = 'active';

-- Create function to handle tournament progress saving
CREATE OR REPLACE FUNCTION save_tournament_progress(
  p_user_id UUID,
  p_tournament_id UUID,
  p_score INTEGER,
  p_distance INTEGER,
  p_coins INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update or insert tournament participant with progress
  INSERT INTO tournament_participants (
    tournament_id,
    user_id,
    profile_id,
    best_score,
    total_games
  )
  VALUES (
    p_tournament_id,
    p_user_id,
    p_user_id,
    p_score,
    1
  )
  ON CONFLICT (tournament_id, user_id)
  DO UPDATE SET
    best_score = GREATEST(tournament_participants.best_score, p_score),
    total_games = tournament_participants.total_games + 1;
END;
$$;

-- Function to finalize tournament and award prizes
CREATE OR REPLACE FUNCTION finalize_tournament(p_tournament_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_winner RECORD;
  v_position INTEGER := 0;
BEGIN
  -- Get tournament details
  SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Get top 3 participants
  FOR v_winner IN
    SELECT 
      tp.user_id,
      tp.profile_id,
      tp.best_score,
      p.username,
      p.full_name
    FROM tournament_participants tp
    JOIN profiles p ON tp.user_id = p.id
    WHERE tp.tournament_id = p_tournament_id
    ORDER BY tp.best_score DESC
    LIMIT 3
  LOOP
    v_position := v_position + 1;
    
    DECLARE
      v_prize NUMERIC;
      v_distance INTEGER;
    BEGIN
      -- Determine prize amount
      IF v_position = 1 THEN
        v_prize := v_tournament.first_prize;
      ELSIF v_position = 2 THEN
        v_prize := v_tournament.second_prize;
      ELSIF v_position = 3 THEN
        v_prize := v_tournament.third_prize;
      ELSE
        v_prize := 0;
      END IF;
      
      -- Calculate distance from score
      v_distance := FLOOR(v_winner.best_score / 10);
      
      -- Insert winner record
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
        v_winner.best_score,
        v_distance,
        v_prize,
        v_winner.username,
        v_winner.full_name
      );
      
      -- Update user's total winnings
      UPDATE profiles
      SET total_winnings = total_winnings + v_prize
      WHERE id = v_winner.user_id;
    END;
  END LOOP;
  
  -- Mark tournament as completed
  UPDATE tournaments
  SET status = 'completed'
  WHERE id = p_tournament_id;
END;
$$;

-- Function to create weekly tournament
CREATE OR REPLACE FUNCTION create_weekly_tournament()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament_id UUID;
BEGIN
  -- Check if there's already an active tournament
  IF EXISTS (SELECT 1 FROM tournaments WHERE status = 'active') THEN
    RETURN NULL;
  END IF;
  
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
    'Weekly Tournament ' || TO_CHAR(NOW(), 'YYYY-MM-DD'),
    NOW() + INTERVAL '7 days',
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
$$;