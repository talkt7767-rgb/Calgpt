
-- Create private storage buckets for meal and product photos
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', false) ON CONFLICT (id) DO UPDATE SET public = false;
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', false) ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS policies: users can only access their own folder (folder name = auth.uid())
CREATE POLICY "users read own meal photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own meal photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own meal photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own meal photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users read own product photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own product photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own product photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own product photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Revoke EXECUTE on SECURITY DEFINER functions from public roles.
-- These functions are only intended to be invoked by triggers / server-side code (service_role).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_ai_rate_limit(uuid, text, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
