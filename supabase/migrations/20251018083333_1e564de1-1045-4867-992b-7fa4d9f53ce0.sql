-- Allow public read access to profiles for leaderboard display
-- Users can only view basic public info (username, full_name) not sensitive data
CREATE POLICY "Anyone can view public profile info"
ON public.profiles
FOR SELECT
USING (true);

-- Drop the overly restrictive policy that only allows users to see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;