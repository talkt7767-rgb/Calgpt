import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function removeChunked(bucket: string, paths: string[]) {
  const chunkSize = 100;
  let removed = 0;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize).filter(Boolean);
    if (chunk.length === 0) continue;
    const { error } = await supabaseAdmin.storage.from(bucket).remove(chunk);
    if (error) {
      console.error(`wipe-monthly-photos: ${bucket} chunk error`, error.message);
    } else {
      removed += chunk.length;
    }
  }
  return removed;
}

export const Route = createFileRoute("/api/public/hooks/wipe-monthly-photos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.WIPE_SECRET_KEY;
        if (!expected) {
          return new Response("Forbidden: Secure wipe key is not configured.", { status: 503 });
        }
        const auth = request.headers.get("authorization") ?? "";
        const apikey = request.headers.get("apikey") ?? "";
        const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
        if (apikey !== expected && bearer !== expected) {
          return new Response("Forbidden", { status: 403 });
        }
        const now = new Date();
        const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

        const [mealsRes, scansRes] = await Promise.all([
          supabaseAdmin
            .from("meals")
            .select("image_url")
            .lt("logged_at", firstOfThisMonth.toISOString())
            .not("image_url", "is", null),
          supabaseAdmin
            .from("product_scans")
            .select("product_image_url,label_image_url")
            .lt("scanned_at", firstOfThisMonth.toISOString()),
        ]);

        const mealPaths = (mealsRes.data ?? [])
          .map((r) => r.image_url as string)
          .filter((p) => typeof p === "string" && p.length > 0);

        const productPaths: string[] = [];
        for (const s of scansRes.data ?? []) {
          if (s.product_image_url) productPaths.push(s.product_image_url);
          if (s.label_image_url) productPaths.push(s.label_image_url);
        }

        const [removedMeals, removedProducts] = await Promise.all([
          removeChunked("meal-photos", mealPaths),
          removeChunked("product-photos", productPaths),
        ]);

        const summary = {
          ok: true,
          ranAt: now.toISOString(),
          windowBefore: firstOfThisMonth.toISOString(),
          removedMealPhotos: removedMeals,
          removedProductPhotos: removedProducts,
        };
        console.log("wipe-monthly-photos:", summary);
        return new Response(JSON.stringify(summary), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST to run wipe" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
