-- Fix security definer view issue by removing views entirely
-- Replace with direct queries in application code to eliminate security risk

-- Drop the views that are causing security definer issues
DROP VIEW IF EXISTS public.current_tournament;
DROP VIEW IF EXISTS public.tournament_leaderboard;

-- These views will be replaced by direct queries in the application:
-- For current tournament: SELECT * FROM tournaments WHERE status = 'active' ORDER BY created_at DESC LIMIT 1;
-- For leaderboard: Direct join query between tournament_participants and profiles tables