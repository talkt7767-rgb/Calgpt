import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getAvatarData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [profileRes, mealsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("avatar_gender,avatar_skin,target_calories,target_protein")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("meals")
        .select("calories,protein,logged_at")
        .gte("logged_at", sevenDaysAgo.toISOString()),
    ]);

    const profile = profileRes.data ?? {
      avatar_gender: "male",
      avatar_skin: "medium",
      target_calories: 2000,
      target_protein: 150,
    };
    const meals = mealsRes.data ?? [];

    const dayMap = new Map<string, { cal: number; p: number }>();
    for (const m of meals) {
      const day = new Date(m.logged_at).toISOString().slice(0, 10);
      const cur = dayMap.get(day) ?? { cal: 0, p: 0 };
      cur.cal += Number(m.calories) || 0;
      cur.p += Number(m.protein) || 0;
      dayMap.set(day, cur);
    }
    const daysLogged = dayMap.size;
    const tCal = profile.target_calories || 2000;
    const tProt = profile.target_protein || 150;
    let pctCal = 0;
    let pctProt = 0;
    for (const v of dayMap.values()) {
      pctCal += Math.min(1, v.cal / tCal);
      pctProt += Math.min(1, v.p / tProt);
    }
    const avgCaloriePct = daysLogged > 0 ? pctCal / daysLogged : 0;
    const avgProteinPct = daysLogged > 0 ? pctProt / daysLogged : 0;

    return {
      gender: (profile.avatar_gender ?? "male") as "male" | "female",
      skin: (profile.avatar_skin ?? "medium") as "light" | "medium" | "deep",
      daysLogged,
      avgCaloriePct,
      avgProteinPct,
    };
  });

export const saveAvatarPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        avatar_gender: z.enum(["male", "female"]),
        avatar_skin: z.enum(["light", "medium", "deep"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
