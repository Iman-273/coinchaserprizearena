-- Fix the security definer view issue by recreating views without elevated privileges
-- Drop existing views owned by postgres and recreate them with proper ownership

-- Drop existing views
DROP VIEW IF EXISTS public.current_tournament;
DROP VIEW IF EXISTS public.tournament_leaderboard;

-- Recreate current_tournament view without elevated privileges
CREATE VIEW public.current_tournament AS
SELECT 
    id,
    entry_fee,
    prize_pool,
    first_prize,
    second_prize,
    third_prize,
    start_date,
    end_date,
    max_participants,
    current_participants,
    created_at,
    status,
    name
FROM public.tournaments
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 1;

-- Recreate tournament_leaderboard view without elevated privileges  
CREATE VIEW public.tournament_leaderboard AS
SELECT 
    tp.tournament_id,
    tp.user_id,
    p.username,
    p.full_name,
    tp.best_score,
    tp.total_games,
    row_number() OVER (PARTITION BY tp.tournament_id ORDER BY tp.best_score DESC, tp.joined_at) AS rank
FROM public.tournament_participants tp
JOIN public.profiles p ON tp.profile_id = p.id
ORDER BY tp.tournament_id, rank;