
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_ai_rate_limit(uuid, text, date) FROM PUBLIC, anon, authenticated;
