-- Restrict access to administrative SECURITY DEFINER functions
-- These functions should only be callable by service role, not by regular users

-- Revoke public access from administrative functions
REVOKE ALL ON FUNCTION public.create_weekly_tournament() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_tournament(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_total_spent(uuid, numeric) FROM PUBLIC;

-- Grant execute permission only to service role
GRANT EXECUTE ON FUNCTION public.create_weekly_tournament() TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_tournament(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_total_spent(uuid, numeric) TO service_role;

-- The handle_new_user function needs to remain accessible for the trigger to work
-- but we'll make it more restrictive by only allowing service_role and postgres
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;