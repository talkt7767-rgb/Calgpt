## 1. Performance pass (everywhere)

Symptom: every page feels slow, the landing video doesn't play.

- **Landing video**: add `muted playsInline autoPlay loop preload="metadata"` and a `poster` image. iOS/Chrome block autoplay without `muted` + `playsInline` — that's almost certainly why nothing plays. Lazy-load the `<video>` only after first paint, fall back to the poster on mobile/slow connections.
- **Images**: convert hero JPGs to WebP via `vite-imagetools`, add explicit `width`/`height` to prevent layout shift, and `loading="lazy"` everywhere except the LCP image (which gets `fetchpriority="high"` + `<link rel="preload">` in that route's `head()`).
- **Dashboard**: the 4 sequential Supabase reads in `dashboard.tsx` already run in `Promise.all`, but they happen in a `useEffect` after mount. Move them into a `createServerFn` + TanStack Query (`ensureQueryData` in the loader, `useSuspenseQuery` in the component) so data streams with SSR and is cached across navigations.
- **Signed URLs**: `MealThumb` calls `createSignedUrl` per row. Batch into one server fn that returns all signed URLs for the day in a single round-trip.
- **Route-level code splitting**: confirm heavy routes (Consult, Scan) aren't pulled into the dashboard bundle.

## 2. Monthly photo wipe (keep history)

User confirmed: delete only the image files on the 1st, keep meal/scan rows. Thumbnails will just render blank for old months.

- Add a TanStack server route at `src/routes/api/public/hooks/wipe-monthly-photos.ts` that:
  1. Computes the previous-month window.
  2. Selects all `image_url` paths from `meals` (logged before the 1st) and `product_image_url` / `label_image_url` from `product_scans`.
  3. Calls `supabaseAdmin.storage.from('meal-photos').remove([...])` and same for `product-photos` in chunks of 1000.
  4. Does **not** delete DB rows. Image columns are left pointing at deleted paths; the UI already handles missing signed URLs gracefully (need to verify `MealThumb` shows a placeholder — add an icon fallback if not).
- Schedule via `pg_cron` + `pg_net` to POST to that route at `0 2 1 * *` (2 AM on the 1st of every month). I'll use the supabase insert tool for the cron SQL (not a migration) because it contains the project URL and anon key.

## 3. Leaked-password protection

This is a Supabase Auth dashboard setting — can't be toggled from code. I'll surface the link in chat:
`https://supabase.com/dashboard/project/nqvwltfpkhhevvacqpqz/auth/providers` → Email provider → enable "Leaked password protection".

## 4. Nutrition & goal calculator

New route `src/routes/_authenticated/calculator.tsx` (also reachable from nav).

Form fields: current weight (kg/lb), target weight, height (cm/ft+in), age, sex (male/female), activity level (sedentary → very active), goal pace (mild/moderate/aggressive).

Math (no AI needed for the numbers — pure formulas, instant):

- **BMR** via Mifflin-St Jeor.
- **TDEE** = BMR × activity multiplier.
- **Deficit/surplus**: 500/750/1000 kcal/day depending on pace, capped so target intake never drops below `1200 (F) / 1500 (M)`.
- **Protein**: 1.6–2.2 g/kg lean body weight depending on cut vs bulk.
- **Time to goal**: `|target − current| × 7700 kcal/kg ÷ daily deficit`, surfaced in weeks.

A "Get AI plan" button calls a new `getGoalPlan` server function (Lovable AI, `google/gemini-3-flash-preview`) that takes the computed numbers and returns a short personalized weekly plan (meal timing, protein sources, warnings). Numbers shown instantly; AI narrative streams in.

Optionally save results to `profiles` (new columns: `current_weight`, `target_weight`, `height_cm`, `age`, `sex`, `activity_level`) so the dashboard targets auto-update.

## 5. Avatar that reacts to logging (5-stage)

Public-facing on the landing page **and** on the dashboard for logged-in users. User confirmed: 5 stages + tips, with a Settings picker for gender + skin tone.

- **Asset generation**: 5 stages × 2 genders × 3 skin tones = 30 PNGs, generated once with `imagegen--generate_image` (premium) and stored under `src/assets/avatar/`. Stages: `skeletal`, `weak`, `average`, `fit`, `peak`.
- **Stage logic** (last 7 days):
  - 0 logs → skeletal
  - 1–2 logs OR <40% protein target → weak
  - 3–4 logs near targets → average
  - 5–6 logs hitting targets → fit
  - 7 logs hitting calorie + protein targets → peak
- **Social-impact tips** at weak/skeletal: short copy like "Low energy in meetings", "Poor sleep recovery", "Strength drops first" — shown as a card below the avatar, not blocking.
- **Mobile-friendly**: avatar card uses aspect-ratio box, `max-w` constraints, swipeable on touch. Tested at 375px width.
- **Logged-out landing demo**: a small interactive widget where moving a slider (0–7 logged days) morphs the avatar through the 5 stages — sells the feature without requiring sign-up.
- **Settings**: new card for "Your avatar" with gender (m/f) + skin tone (light/medium/deep) saved to `profiles`.

## 6. Mobile-friendliness sweep

- Audit existing pages at 375px: dashboard rings (already responsive), header, scan flows, consult, calculator, avatar.
- Bottom nav already exists; verify new Calculator route gets an entry (replace History or move History under a "More" drawer).
- Tap targets ≥44px, no horizontal scroll, safe-area-inset padding on bottom nav.

## Database changes

One migration:

- `profiles`: add `current_weight numeric`, `target_weight numeric`, `height_cm numeric`, `age int`, `sex text check (sex in ('male','female'))`, `activity_level text`, `avatar_gender text default 'male'`, `avatar_skin text default 'medium'`.

Then a separate insert-tool call for the `pg_cron` job.

## Technical details

- Server functions: `getDashboardData`, `getSignedMealUrls`, `getGoalPlan`, `getAvatarStage`. All under `src/lib/*.functions.ts` with `requireSupabaseAuth`.
- Public-facing landing avatar widget uses local state, no auth required.
- Cron route under `/api/public/hooks/` to bypass auth gate; it only deletes storage objects, no PII returned.
- Lovable AI key already configured (`LOVABLE_API_KEY` present).

## Out of scope (flagging explicitly)

- Animated/Lottie avatar (you picked the static 5-stage option).
- Deleting meal/scan history rows on the 1st (you picked images-only).
- Push notifications / email reminders to log meals.
