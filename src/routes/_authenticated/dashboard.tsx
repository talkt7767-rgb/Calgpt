import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Camera, Package, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AvatarCharacter, computeAvatarStage } from "@/components/avatar-character";
import { MealThumb } from "@/components/meal-thumb";
import { getAvatarData } from "@/lib/avatar.functions";
import { getDashboardData } from "@/lib/goal.functions";
import { getSignedMealUrls } from "@/lib/ai.functions";
import heroDashboard from "@/assets/hero-dashboard.jpg";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

interface Profile {
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
}
interface Meal {
  id: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string;
  logged_at: string;
}

function Ring({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const r = 36,
    c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-16 sm:h-24 sm:w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} stroke="oklch(0.88 0.03 75)" strokeWidth="8" fill="none" />
          <motion.circle
            cx="40"
            cy="40"
            r={r}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * pct) / 100 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold sm:text-lg">{Math.round(value)}</span>
          <span className="text-[9px] text-muted-foreground sm:text-[10px]">/{max}</span>
        </div>
      </div>
      <span className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{label}</span>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-xl bg-muted p-2 text-center">
      <div className="text-base font-bold sm:text-lg">{v}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [monthMeals, setMonthMeals] = useState<
    { calories: number; protein: number; carbs: number; fat: number }[]
  >([]);
  const [monthProductCount, setMonthProductCount] = useState(0);
  const [avatar, setAvatar] = useState<{
    gender: "male" | "female";
    skin: "light" | "medium" | "deep";
    stage: 1 | 2 | 3 | 4 | 5;
  } | null>(null);
  const fetchAvatar = useServerFn(getAvatarData);
  const fetchDashboardData = useServerFn(getDashboardData);
  const fetchSignedUrls = useServerFn(getSignedMealUrls);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    fetchAvatar()
      .then((d) =>
        setAvatar({
          gender: d.gender,
          skin: d.skin,
          stage: computeAvatarStage({
            daysLogged: d.daysLogged,
            avgProteinPct: d.avgProteinPct,
            avgCaloriePct: d.avgCaloriePct,
          }),
        }),
      )
      .catch(() => {});
  }, [user, fetchAvatar]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const d = await fetchDashboardData();
        if (d.profile) setProfile(d.profile);
        setMeals(d.meals);
        setMonthMeals(d.monthMeals);
        setMonthProductCount(d.monthProductCount);

        const paths = d.meals.map((m: any) => m.image_url).filter(Boolean);
        if (paths.length > 0) {
          const { urls } = await fetchSignedUrls({ data: { paths } });
          setSignedUrls(urls);
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to fetch dashboard data");
      }
    })();
  }, [user, fetchDashboardData, fetchSignedUrls]);

  const totals = meals.reduce(
    (a, m) => ({ cal: a.cal + m.calories, p: a.p + m.protein, c: a.c + m.carbs, f: a.f + m.fat }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );
  const monthTotals = monthMeals.reduce(
    (a, m) => ({ cal: a.cal + m.calories, p: a.p + m.protein, c: a.c + m.carbs, f: a.f + m.fat }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );
  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });
  const t = profile ?? {
    target_calories: 2000,
    target_protein: 150,
    target_carbs: 250,
    target_fat: 70,
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <img
          src={heroDashboard}
          alt=""
          loading="lazy"
          className="h-40 w-full object-cover md:h-56"
          width={800}
          height={224}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          <Ring
            value={totals.cal}
            max={t.target_calories}
            label="kcal"
            color="oklch(0.72 0.19 50)"
          />
          <Ring
            value={totals.p}
            max={t.target_protein}
            label="Protein"
            color="oklch(0.65 0.2 25)"
          />
          <Ring value={totals.c} max={t.target_carbs} label="Carbs" color="oklch(0.7 0.18 80)" />
          <Ring value={totals.f} max={t.target_fat} label="Fat" color="oklch(0.7 0.15 100)" />
        </div>
      </div>

      {avatar && (
        <div className="rounded-3xl border border-border bg-gradient-to-br from-accent/30 to-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Your physique · last 7 days</h2>
            <Link to="/settings" className="text-xs text-primary">
              Customize
            </Link>
          </div>
          <div className="flex justify-center">
            <AvatarCharacter stage={avatar.stage} gender={avatar.gender} skin={avatar.skin} />
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">This month · {monthName}</h2>
          <span className="text-[10px] text-muted-foreground">resets on the 1st</span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Stat label="Meals" v={monthMeals.length} />
          <Stat label="Products" v={monthProductCount} />
          <Stat label="kcal" v={Math.round(monthTotals.cal)} />
          <Stat label="Protein g" v={Math.round(monthTotals.p)} />
          <Stat label="Carbs g" v={Math.round(monthTotals.c)} />
          <Stat label="Fat g" v={Math.round(monthTotals.f)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/scan/meal"
          className="flex flex-col items-center gap-2 rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm"
        >
          <Camera className="h-6 w-6" />
          <span className="text-sm font-medium">Scan meal</span>
        </Link>
        <Link
          to="/scan/product"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4"
        >
          <Package className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Scan product</span>
        </Link>
        <Link
          to="/consult"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4"
        >
          <MessageCircle className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Ask AI</span>
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Today's meals</h2>
        {meals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No meals yet.{" "}
            <Link to="/scan/meal" className="text-primary font-medium">
              Scan one →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {meals.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <MealThumb path={m.image_url} fallbackUrl={signedUrls[m.image_url]} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(m.calories)} kcal · P{Math.round(m.protein)} C{Math.round(m.carbs)}{" "}
                    F{Math.round(m.fat)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
