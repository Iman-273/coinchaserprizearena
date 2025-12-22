-- Fix the security definer view issue by changing view ownership from postgres to authenticated role
-- Views owned by postgres act like SECURITY DEFINER and bypass RLS policies

-- Change ownership of views to remove security definer behavior
ALTER VIEW public.current_tournament OWNER TO authenticated;
ALTER VIEW public.tournament_leaderboard OWNER TO authenticated;