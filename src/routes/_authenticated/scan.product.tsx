import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { analyzeProduct } from "@/lib/ai.functions";
import heroProducts from "@/assets/hero-products.jpg";

export const Route = createFileRoute("/_authenticated/scan/product")({ component: ScanProduct });

interface ProductResult {
  product_name: string;
  verdict: "Good" | "Okay" | "Avoid";
  verdict_score: number;
  verdict_reason: string;
  harmful_items: { name: string; reason: string }[];
  safe_items: { name: string; benefit: string }[];
  nutrition_summary: {
    calories?: number;
    sugar_g?: number;
    sodium_mg?: number;
    protein_g?: number;
  };
  summary: string;
  alternatives: { name: string; brand: string; key_benefit: string; reason: string }[];
}

function PhotoBox({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  return (
    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card">
      {file && url ? (
        <img src={url} className="h-full w-full object-cover" alt="" width={400} height={400} />
      ) : (
        <>
          <Plus className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onPick(f);
            setUrl(URL.createObjectURL(f));
          }
        }}
      />
    </label>
  );
}

function ScanProduct() {
  const { user } = useAuth();
  const nav = useNavigate();
  const analyze = useServerFn(analyzeProduct);
  const [front, setFront] = useState<File | null>(null);
  const [label, setLabel] = useState<File | null>(null);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [paths, setPaths] = useState<{ front: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!front || !label || !user) return;
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      const fp = `${user.id}/${id}-front.${front.name.split(".").pop() || "jpg"}`;
      const lp = `${user.id}/${id}-label.${label.name.split(".").pop() || "jpg"}`;
      const [u1, u2] = await Promise.all([
        supabase.storage.from("product-photos").upload(fp, front, { contentType: front.type }),
        supabase.storage.from("product-photos").upload(lp, label, { contentType: label.type }),
      ]);
      if (u1.error || u2.error) throw new Error(u1.error?.message || u2.error?.message);
      const [s1, s2] = await Promise.all([
        supabase.storage.from("product-photos").createSignedUrl(fp, 3600),
        supabase.storage.from("product-photos").createSignedUrl(lp, 3600),
      ]);
      const r = (await analyze({
        data: { frontUrl: s1.data!.signedUrl, labelUrl: s2.data!.signedUrl },
      })) as ProductResult;
      setResult(r);
      setPaths({ front: fp, label: lp });

      const { error } = await supabase.from("product_scans").insert({
        user_id: user.id,
        product_image_url: fp,
        label_image_url: lp,
        product_name: r.product_name,
        verdict: r.verdict,
        verdict_score: Math.round(r.verdict_score),
        verdict_reason: r.verdict_reason,
        harmful_items: r.harmful_items,
        safe_items: r.safe_items,
        nutrition_summary: r.nutrition_summary,
        summary: r.summary,
        alternatives: r.alternatives,
      });
      if (error) toast.error(error.message);
      else toast.success("Product analyzed");
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const verdictColor =
    result?.verdict === "Good"
      ? "bg-green-500/10 text-green-700"
      : result?.verdict === "Okay"
        ? "bg-yellow-500/10 text-yellow-700"
        : "bg-red-500/10 text-red-700";

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <img
          src={heroProducts}
          alt=""
          loading="lazy"
          className="h-32 w-full object-cover md:h-40"
          width={640}
          height={160}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <h1 className="text-2xl font-bold">Scan a product</h1>
          <p className="text-sm text-muted-foreground">
            Front + ingredients → instant health score.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PhotoBox label="Front of pack" file={front} onPick={setFront} />
        <PhotoBox label="Ingredients" file={label} onPick={setLabel} />
      </div>
      {!result && (
        <Button onClick={run} disabled={!front || !label || busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            "Analyze product"
          )}
        </Button>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{result.product_name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{result.summary}</p>
            </div>
            <div className={`shrink-0 rounded-2xl px-3 py-2 text-center ${verdictColor}`}>
              <div className="text-2xl font-bold">{result.verdict_score}/10</div>
              <div className="text-xs font-medium">{result.verdict}</div>
            </div>
          </div>

          {result.nutrition_summary && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-muted p-2">
                <div className="text-base font-bold">
                  {Math.round(result.nutrition_summary.calories ?? 0)}
                </div>
                <div className="text-[10px] text-muted-foreground">kcal</div>
              </div>
              <div className="rounded-xl bg-muted p-2">
                <div className="text-base font-bold">
                  {Math.round(result.nutrition_summary.sugar_g ?? 0)}
                </div>
                <div className="text-[10px] text-muted-foreground">sugar g</div>
              </div>
              <div className="rounded-xl bg-muted p-2">
                <div className="text-base font-bold">
                  {Math.round(result.nutrition_summary.sodium_mg ?? 0)}
                </div>
                <div className="text-[10px] text-muted-foreground">sodium mg</div>
              </div>
              <div className="rounded-xl bg-muted p-2">
                <div className="text-base font-bold">
                  {Math.round(result.nutrition_summary.protein_g ?? 0)}
                </div>
                <div className="text-[10px] text-muted-foreground">protein g</div>
              </div>
            </div>
          )}

          {result.harmful_items.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-red-700">Watch out</h4>
              <ul className="space-y-1 text-sm">
                {result.harmful_items.map((i) => (
                  <li key={i.name}>
                    • <strong>{i.name}</strong> — {i.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.safe_items.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-green-700">Good ingredients</h4>
              <ul className="space-y-1 text-sm">
                {result.safe_items.map((i) => (
                  <li key={i.name}>
                    • <strong>{i.name}</strong> — {i.benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.alternatives.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Healthier alternatives</h4>
              <div className="space-y-2">
                {result.alternatives.map((a) => (
                  <div key={a.name} className="rounded-xl bg-muted p-3 text-sm">
                    <div className="font-medium">
                      {a.name} <span className="text-muted-foreground">· {a.brand}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{a.key_benefit}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button onClick={() => nav({ to: "/dashboard" })} className="w-full">
            Done
          </Button>
        </motion.div>
      )}
    </div>
  );
}
