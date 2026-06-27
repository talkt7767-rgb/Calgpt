
-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  target_calories integer NOT NULL DEFAULT 2000,
  target_protein integer NOT NULL DEFAULT 150,
  target_carbs integer NOT NULL DEFAULT 230,
  target_fat integer NOT NULL DEFAULT 65,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users select own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- meals
CREATE TABLE public.meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  confidence text,
  notes text,
  feedback text,
  flagged_at timestamptz,
  logged_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meals_user_logged_idx ON public.meals (user_id, logged_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT ALL ON public.meals TO service_role;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users select own meals" ON public.meals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own meals" ON public.meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own meals" ON public.meals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own meals" ON public.meals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- product_scans
CREATE TABLE public.product_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_image_url text NOT NULL,
  label_image_url text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  verdict text NOT NULL,
  verdict_score numeric NOT NULL DEFAULT 0,
  verdict_reason text,
  summary text NOT NULL DEFAULT '',
  harmful_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  safe_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  nutrition_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
  scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_scans_user_idx ON public.product_scans (user_id, scanned_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_scans TO authenticated;
GRANT ALL ON public.product_scans TO service_role;
ALTER TABLE public.product_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users select own scans" ON public.product_scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own scans" ON public.product_scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own scans" ON public.product_scans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own scans" ON public.product_scans FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- saved_alternatives
CREATE TABLE public.saved_alternatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  key_benefit text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'product',
  source_scan_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_alts_user_idx ON public.saved_alternatives (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_alternatives TO authenticated;
GRANT ALL ON public.saved_alternatives TO service_role;
ALTER TABLE public.saved_alternatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users select own alts" ON public.saved_alternatives FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own alts" ON public.saved_alternatives FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own alts" ON public.saved_alternatives FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own alts" ON public.saved_alternatives FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ai_rate_limits
CREATE TABLE public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint, day)
);
GRANT SELECT ON public.ai_rate_limits TO authenticated;
GRANT ALL ON public.ai_rate_limits TO service_role;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users select own rate limits" ON public.ai_rate_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- increment_ai_rate_limit
CREATE OR REPLACE FUNCTION public.increment_ai_rate_limit(_user_id uuid, _endpoint text, _day date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO public.ai_rate_limits (user_id, endpoint, day, count, updated_at)
  VALUES (_user_id, _endpoint, _day, 1, now())
  ON CONFLICT (user_id, endpoint, day)
  DO UPDATE SET count = ai_rate_limits.count + 1, updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- storage bucket for scan images
INSERT INTO storage.buckets (id, name, public) VALUES ('scans', 'scans', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users read own scan files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own scan files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own scan files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
