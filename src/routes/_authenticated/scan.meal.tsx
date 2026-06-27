import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeMeal } from "@/lib/ai.functions";
import heroMeals from "@/assets/hero-meals.jpg";

export const Route = createFileRoute("/_authenticated/scan/meal")({ component: ScanMeal });

interface MealResult {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: string[];
  confidence: string;
  notes?: string;
}

function ScanMeal() {
  const { user } = useAuth();
  const nav = useNavigate();
  const analyze = useServerFn(analyzeMeal);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MealResult | null>(null);
  const [override, setOverride] = useState("");
  const [busy, setBusy] = useState(false);

  const onPick = (f: File) => {
    setFile(f);
    setResult(null);
    setPath(null);
    setSignedUrl(null);
    setPreview(URL.createObjectURL(f));
  };

  const upload = async () => {
    if (!file || !user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const p = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("meal-photos")
      .upload(p, file, { contentType: file.type });
    if (error) {
      toast.error(error.message);
      return null;
    }
    const { data: signed } = await supabase.storage.from("meal-photos").createSignedUrl(p, 3600);
    setPath(p);
    setSignedUrl(signed?.signedUrl ?? null);
    return { path: p, url: signed?.signedUrl };
  };

  const runAnalyze = async (overrideName?: string) => {
    setBusy(true);
    try {
      let url = signedUrl;
      if (!url) {
        const u = await upload();
        if (!u) {
          setBusy(false);
          return;
        }
        url = u.url ?? null;
      }
      if (!url) throw new Error("No image");
      const r = await analyze({ data: { imageUrl: url, overrideName } });
      setResult(r as MealResult);
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const save = async () => {
    if (!user || !result || !path) return;
    setBusy(true);
    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      image_url: path,
      description: result.description,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      items: result.items,
      confidence: result.confidence,
      notes: result.notes,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Meal logged!");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <img
          src={heroMeals}
          alt=""
          loading="lazy"
          className="h-32 w-full object-cover md:h-40"
          width={640}
          height={160}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <h1 className="text-2xl font-bold">Scan a meal</h1>
          <p className="text-sm text-muted-foreground">Take a photo. AI will estimate macros.</p>
        </div>
      </div>

      <label className="block cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-border bg-card">
        {preview ? (
          <img
            src={preview}
            alt=""
            className="aspect-square w-full object-cover"
            width={400}
            height={400}
          />
        ) : (
          <div className="flex aspect-square flex-col items-center justify-center gap-2 text-muted-foreground">
            <Camera className="h-10 w-10" />
            <span className="text-sm">Tap to add photo</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
        />
      </label>

      {file && !result && (
        <Button onClick={() => runAnalyze()} disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            "Analyze meal"
          )}
        </Button>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-3xl border border-border bg-card p-5"
        >
          <div>
            <h3 className="text-lg font-semibold">{result.description}</h3>
            <p className="text-xs text-muted-foreground">Confidence: {result.confidence}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="kcal" v={result.calories} />
            <Stat label="P" v={result.protein} />
            <Stat label="C" v={result.carbs} />
            <Stat label="F" v={result.fat} />
          </div>
          {result.items?.length > 0 && (
            <p className="text-sm text-muted-foreground">Items: {result.items.join(", ")}</p>
          )}
          <div>
            <Label>Wrong food? Tell AI what it really is:</Label>
            <div className="mt-1 flex gap-2">
              <Input
                placeholder="e.g. Caesar salad"
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={busy || !override}
                onClick={() => runAnalyze(override)}
              >
                Re-analyze
              </Button>
            </div>
          </div>
          <Button onClick={save} disabled={busy} className="w-full">
            Save to today
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-xl bg-muted p-2">
      <div className="text-lg font-bold">{Math.round(v)}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
