import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { checkRateLimit } from "./rate-limiter";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const PlanInput = z.object({
  currentWeightKg: z.number().positive().max(500),
  targetWeightKg: z.number().positive().max(500),
  heightCm: z.number().positive().max(280),
  age: z.number().int().min(13).max(100),
  sex: z.enum(["male", "female"]),
  targetCalories: z.number().int().min(800).max(8000),
  proteinG: z.number().int().min(0).max(500),
  carbsG: z.number().int().min(0).max(1000),
  fatG: z.number().int().min(0).max(500),
  weeksToGoal: z.number().int().min(0).max(520),
});

async function callAI(body: any) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;

  if (!geminiKey && !lovableKey) {
    throw new Error("AI not configured. Please set GEMINI_API_KEY or LOVABLE_API_KEY.");
  }

  let url = GATEWAY_URL;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (geminiKey) {
    url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    headers["Authorization"] = `Bearer ${geminiKey}`;
    if (body && typeof body === "object") {
      if (body.model === "google/gemini-2.5-flash") {
        body.model = "gemini-3.5-flash";
      }
    }
  } else {
    headers["Authorization"] = `Bearer ${lovableKey}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment.");
  if (res.status === 402)
    throw new Error("AI credits exhausted. Add credits in Lovable workspace.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("AI error response", res.status, t);
    throw new Error(`AI error: ${res.status} - ${t}`);
  }
  return res.json();
}

export const getGoalPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PlanInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    checkRateLimit("getGoalPlan", userId);
    const direction =
      data.targetWeightKg < data.currentWeightKg
        ? "lose weight"
        : data.targetWeightKg > data.currentWeightKg
          ? "gain weight"
          : "maintain";

    const prompt = `User wants to ${direction}.
Current: ${data.currentWeightKg}kg, target: ${data.targetWeightKg}kg, height: ${data.heightCm}cm, age: ${data.age}, ${data.sex}.
Daily targets: ${data.targetCalories} kcal, ${data.proteinG}g protein, ${data.carbsG}g carbs, ${data.fatG}g fat.
Estimated weeks to goal: ${data.weeksToGoal}.

Write a short, actionable weekly plan in 4-6 bullet points covering:
- meal timing & protein distribution
- 2-3 specific high-protein meal ideas
- one warning about what NOT to do
Use markdown, be concise, friendly, and specific. No fluff.`;

    const result = await callAI({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a pragmatic nutrition coach. Output short, scannable markdown bullets only.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
    });

    const reply: string =
      result?.choices?.[0]?.message?.content ?? "Couldn't generate a plan. Try again.";
    return { reply };
  });

export const saveGoalProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        current_weight_kg: z.number().positive().max(500),
        target_weight_kg: z.number().positive().max(500),
        height_cm: z.number().positive().max(280),
        age: z.number().int().min(13).max(100),
        sex: z.enum(["male", "female"]),
        activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
        target_calories: z.number().int().min(800).max(8000),
        target_protein: z.number().int().min(0).max(500),
        target_carbs: z.number().int().min(0).max(1000),
        target_fat: z.number().int().min(0).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [pRes, mRes, mmRes, psRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("target_calories,target_protein,target_carbs,target_fat")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("meals")
        .select("*")
        .gte("logged_at", today.toISOString())
        .order("logged_at", { ascending: false }),
      supabase
        .from("meals")
        .select("calories,protein,carbs,fat")
        .gte("logged_at", monthStart.toISOString()),
      supabase
        .from("product_scans")
        .select("id", { count: "exact", head: true })
        .gte("scanned_at", monthStart.toISOString()),
    ]);

    if (pRes.error) throw new Error(pRes.error.message);
    if (mRes.error) throw new Error(mRes.error.message);
    if (mmRes.error) throw new Error(mmRes.error.message);
    if (psRes.error) throw new Error(psRes.error.message);

    return {
      profile: pRes.data,
      meals: mRes.data ?? [],
      monthMeals: mmRes.data ?? [],
      monthProductCount: psRes.count ?? 0,
    };
  });
