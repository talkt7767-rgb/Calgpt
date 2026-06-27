import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { checkRateLimit } from "./rate-limiter";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function assertSupabaseStorageUrl(url: string) {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error("Server misconfigured");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid image URL");
  }
  const baseUrl = new URL(base);
  if (parsed.origin !== baseUrl.origin) throw new Error("Invalid image URL");
  if (!parsed.pathname.startsWith("/storage/v1/")) throw new Error("Invalid image URL");
}

async function fetchAsBase64(url: string): Promise<{ data: string; mime: string }> {
  assertSupabaseStorageUrl(url);
  const r = await fetch(url, { redirect: "manual" });
  if (r.status >= 300 && r.status < 400) throw new Error("Unexpected redirect");
  if (!r.ok) throw new Error("Failed to fetch image");
  const mime = r.headers.get("content-type") || "image/jpeg";
  const buf = await r.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  return { data: b64, mime };
}

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
    console.error("AI gateway error", res.status, t);
    throw new Error(`AI error: ${res.status}`);
  }
  return res.json();
}

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
};
const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v : fallback;
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function parseToolArgs(result: any): any {
  const tc = result?.choices?.[0]?.message?.tool_calls?.[0];
  const raw = tc?.function?.arguments;
  if (!raw) {
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {
          /* ignore */
        }
      }
    }
    throw new Error("AI returned no structured result. Try a clearer photo.");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("AI returned malformed result. Please retry.");
  }
}

export const analyzeMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        imageUrl: z.string().url().max(2048),
        overrideName: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    checkRateLimit("analyzeMeal", userId);
    const img = await fetchAsBase64(data.imageUrl);
    const userText = data.overrideName
      ? `The user says this meal is: "${data.overrideName}". Estimate realistic nutrition values for a typical serving.`
      : "Identify this meal and estimate calories and macros for the visible serving. Always return numeric values, never null or 'NA'.";

    const result = await callAI({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a nutritionist analyzing meal photos. Return realistic, numeric calorie and macro estimates for the entire visible portion. Never return null, NA, or non-numeric values — make a best-effort numeric estimate even when uncertain. Use confidence='low' if you are unsure.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: `data:${img.mime};base64,${img.data}` } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "log_meal",
            description:
              "Log identified meal nutrition. All numeric fields are required and must be finite numbers.",
            parameters: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "Short meal name e.g. 'Grilled chicken salad'",
                },
                calories: { type: "number", description: "Total kcal for the visible portion" },
                protein: { type: "number", description: "grams of protein" },
                carbs: { type: "number", description: "grams of carbohydrates" },
                fat: { type: "number", description: "grams of fat" },
                items: { type: "array", items: { type: "string" } },
                confidence: { type: "string", enum: ["low", "medium", "high"] },
                notes: { type: "string" },
              },
              required: [
                "description",
                "calories",
                "protein",
                "carbs",
                "fat",
                "items",
                "confidence",
              ],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "log_meal" } },
    });

    const args = parseToolArgs(result);
    return {
      description: str(args.description, data.overrideName || "Meal"),
      calories: num(args.calories),
      protein: num(args.protein),
      carbs: num(args.carbs),
      fat: num(args.fat),
      items: arr<string>(args.items).map((i) => String(i)),
      confidence: str(args.confidence, "low"),
      notes: typeof args.notes === "string" ? args.notes : undefined,
    };
  });

export const analyzeProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        frontUrl: z.string().url().max(2048),
        labelUrl: z.string().url().max(2048),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    checkRateLimit("analyzeProduct", userId);
    const [front, label] = await Promise.all([
      fetchAsBase64(data.frontUrl),
      fetchAsBase64(data.labelUrl),
    ]);

    const result = await callAI({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a food product health analyst. Rate packaged foods on a 0-10 scale (0 worst, 10 best) based on the front label and ingredients. Identify harmful additives, sugars, preservatives, and beneficial ingredients. Suggest 3 healthier alternatives. Always return numeric values for nutrition fields — use 0 if unknown.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product. First image is the front of package, second is the ingredients label.",
            },
            { type: "image_url", image_url: { url: `data:${front.mime};base64,${front.data}` } },
            { type: "image_url", image_url: { url: `data:${label.mime};base64,${label.data}` } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "rate_product",
            parameters: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                verdict: { type: "string", enum: ["Good", "Okay", "Avoid"] },
                verdict_score: { type: "number", description: "0-10 health score, integer" },
                verdict_reason: { type: "string" },
                harmful_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { name: { type: "string" }, reason: { type: "string" } },
                    required: ["name", "reason"],
                  },
                },
                safe_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { name: { type: "string" }, benefit: { type: "string" } },
                    required: ["name", "benefit"],
                  },
                },
                nutrition_summary: {
                  type: "object",
                  properties: {
                    calories: { type: "number" },
                    sugar_g: { type: "number" },
                    sodium_mg: { type: "number" },
                    protein_g: { type: "number" },
                  },
                },
                summary: { type: "string" },
                alternatives: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      brand: { type: "string" },
                      key_benefit: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["name", "brand", "key_benefit", "reason"],
                  },
                },
              },
              required: [
                "product_name",
                "verdict",
                "verdict_score",
                "verdict_reason",
                "harmful_items",
                "safe_items",
                "nutrition_summary",
                "summary",
                "alternatives",
              ],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "rate_product" } },
    });

    const a = parseToolArgs(result);
    const verdict: "Good" | "Okay" | "Avoid" =
      a.verdict === "Good" || a.verdict === "Okay" || a.verdict === "Avoid" ? a.verdict : "Okay";
    const ns = a.nutrition_summary || {};
    return {
      product_name: str(a.product_name, "Unknown product"),
      verdict,
      verdict_score: Math.max(0, Math.min(10, Math.round(num(a.verdict_score, 5)))),
      verdict_reason: str(a.verdict_reason),
      harmful_items: arr<any>(a.harmful_items)
        .map((i) => ({ name: str(i?.name), reason: str(i?.reason) }))
        .filter((i) => i.name),
      safe_items: arr<any>(a.safe_items)
        .map((i) => ({ name: str(i?.name), benefit: str(i?.benefit) }))
        .filter((i) => i.name),
      nutrition_summary: {
        calories: num(ns.calories),
        sugar_g: num(ns.sugar_g),
        sodium_mg: num(ns.sodium_mg),
        protein_g: num(ns.protein_g),
      },
      summary: str(a.summary),
      alternatives: arr<any>(a.alternatives)
        .map((x) => ({
          name: str(x?.name),
          brand: str(x?.brand),
          key_benefit: str(x?.key_benefit),
          reason: str(x?.reason),
        }))
        .filter((x) => x.name),
    };
  });

export const aiConsult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: { role: "user" | "assistant"; content: string }[] }) => {
    const MAX_MESSAGES = 50;
    const MAX_CONTENT_LEN = 4000;
    if (!d || !Array.isArray(d.messages)) throw new Error("Invalid messages");
    if (d.messages.length === 0) throw new Error("No messages provided");
    if (d.messages.length > MAX_MESSAGES) throw new Error("Too many messages");
    // SECURITY: Discard any assistant-role messages from the client to prevent
    // prompt injection via fabricated assistant turns. Only user messages are trusted.
    const messages = d.messages
      .filter((m) => m && m.role === "user" && typeof m.content === "string")
      .map((m) => {
        if (m.content.length > MAX_CONTENT_LEN) throw new Error("Message too long");
        return { role: "user" as const, content: m.content };
      });
    if (messages.length === 0) throw new Error("No user messages provided");
    return { messages };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    checkRateLimit("aiConsult", userId);
    const [{ data: profile }, { data: meals }] = await Promise.all([
      supabase
        .from("profiles")
        .select("target_calories,target_protein,target_carbs,target_fat")
        .maybeSingle(),
      supabase
        .from("meals")
        .select("description,calories,protein,carbs,fat,logged_at")
        .order("logged_at", { ascending: false })
        .limit(5),
    ]);

    const sys = `You are an expert AI food and nutrition coach for the Cal Gpt app. Be warm, concise, and specific. Always reply in clear English markdown.
User's daily targets: ${JSON.stringify(profile ?? {})}.
Recent meals: ${JSON.stringify(meals ?? [])}.
Give actionable advice and meal ideas based on what they need to hit their goals.`;

    const result = await callAI({
      model: MODEL,
      messages: [{ role: "system", content: sys }, ...data.messages],
      max_tokens: 2048,
    });
    const reply = str(
      result?.choices?.[0]?.message?.content,
      "Sorry, I couldn't generate a response. Please try again.",
    );
    return { reply };
  });

export const getSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bucket: string; path: string }) => {
    const ALLOWED_BUCKETS = ["meal-photos", "product-photos"] as const;
    if (
      !d ||
      typeof d.bucket !== "string" ||
      !ALLOWED_BUCKETS.includes(d.bucket as (typeof ALLOWED_BUCKETS)[number])
    ) {
      throw new Error("Invalid bucket");
    }
    if (typeof d.path !== "string" || d.path.length === 0 || d.path.length > 512) {
      throw new Error("Invalid path");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Path traversal & IDOR verification
    if (
      data.path.includes("..") ||
      data.path.startsWith("/") ||
      data.path.startsWith("\\") ||
      !data.path.startsWith(`${userId}/`)
    ) {
      throw new Error("Unauthorized: Access to this file path is forbidden");
    }
    const { data: signed, error } = await supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const getSignedMealUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paths: string[] }) => {
    if (!d || !Array.isArray(d.paths)) throw new Error("Invalid paths");
    if (d.paths.length > 100) throw new Error("Too many paths requested");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.paths.length === 0) return { urls: {} };
    const storage = supabase.storage.from("meal-photos");
    const results = await Promise.all(
      data.paths.map(async (p) => {
        // Path traversal & IDOR verification
        if (
          typeof p !== "string" ||
          p.includes("..") ||
          p.startsWith("/") ||
          p.startsWith("\\") ||
          !p.startsWith(`${userId}/`)
        ) {
          return { path: p, signedUrl: null, error: new Error("Forbidden") };
        }
        const { data: resData, error } = await storage.createSignedUrl(p, 3600);
        return { path: p, signedUrl: resData?.signedUrl || null, error };
      })
    );
    const urls: Record<string, string> = {};
    for (const r of results) {
      if (r.signedUrl) {
        urls[r.path] = r.signedUrl;
      }
    }
    return { urls };
  });
