
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS target_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS activity_level text,
  ADD COLUMN IF NOT EXISTS avatar_gender text DEFAULT 'male',
  ADD COLUMN IF NOT EXISTS avatar_skin text DEFAULT 'medium';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sex_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sex_check CHECK (sex IS NULL OR sex IN ('male','female'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_gender_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_gender_check CHECK (avatar_gender IN ('male','female'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_skin_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_skin_check CHECK (avatar_skin IN ('light','medium','deep'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_activity_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_activity_check CHECK (
    activity_level IS NULL OR activity_level IN ('sedentary','light','moderate','active','very_active')
  );
