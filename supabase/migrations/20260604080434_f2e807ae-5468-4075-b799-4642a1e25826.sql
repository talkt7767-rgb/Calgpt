DROP POLICY IF EXISTS "users read own meal photos" ON storage.objects;
DROP POLICY IF EXISTS "users upload own meal photos" ON storage.objects;
DROP POLICY IF EXISTS "users update own meal photos" ON storage.objects;
DROP POLICY IF EXISTS "users delete own meal photos" ON storage.objects;
DROP POLICY IF EXISTS "users read own product photos" ON storage.objects;
DROP POLICY IF EXISTS "users upload own product photos" ON storage.objects;
DROP POLICY IF EXISTS "users update own product photos" ON storage.objects;
DROP POLICY IF EXISTS "users delete own product photos" ON storage.objects;

CREATE POLICY "users read own meal photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own meal photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own meal photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own meal photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users read own product photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own product photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users update own product photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own product photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);