import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Calculator as CalcIcon, Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computePlan, type Activity, type Pace, type Sex } from "@/lib/calculator";
import { getGoalPlan, saveGoalProfile } from "@/lib/goal.functions";

export const Route = createFileRoute("/_authenticated/calculator")({
  component: CalculatorPage,
});

function CalculatorPage() {
  const [form, setForm] = useState({
    currentWeightKg: 75,
    targetWeightKg: 70,
    heightCm: 175,
    age: 28,
    sex: "male" as Sex,
    activity: "moderate" as Activity,
    pace: "moderate" as Pace,
  });
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const result = useMemo(() => computePlan(form), [form]);
  const fetchPlan = useServerFn(getGoalPlan);
  const saveProfile = useServerFn(saveGoalProfile);

  const u = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const ask = async () => {
    setAiBusy(true);
    setAiPlan(null);
    try {
      const { reply } = await fetchPlan({
        data: {
          currentWeightKg: form.currentWeightKg,
          targetWeightKg: form.targetWeightKg,
          heightCm: form.heightCm,
          age: form.age,
          sex: form.sex,
          targetCalories: result.targetCalories,
          proteinG: result.proteinG,
          carbsG: result.carbsG,
          fatG: result.fatG,
          weeksToGoal: result.weeksToGoal,
        },
      });
      setAiPlan(reply);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate plan");
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    setSaveBusy(true);
    try {
      await saveProfile({
        data: {
          current_weight_kg: form.currentWeightKg,
          target_weight_kg: form.targetWeightKg,
          height_cm: form.heightCm,
          age: form.age,
          sex: form.sex,
          activity_level: form.activity,
          target_calories: result.targetCalories,
          target_protein: result.proteinG,
          target_carbs: result.carbsG,
          target_fat: result.fatG,
        },
      });
      toast.success("Saved to your profile — dashboard targets updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalcIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Goal calculator</h1>
          <p className="text-xs text-muted-foreground">
            Calories, protein, and time-to-goal — instant.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Current weight (kg)">
            <Input
              type="number"
              min={20}
              max={400}
              value={form.currentWeightKg}
              onChange={(e) => u("currentWeightKg", +e.target.value)}
            />
          </Field>
          <Field label="Target weight (kg)">
            <Input
              type="number"
              min={20}
              max={400}
              value={form.targetWeightKg}
              onChange={(e) => u("targetWeightKg", +e.target.value)}
            />
          </Field>
          <Field label="Height (cm)">
            <Input
              type="number"
              min={100}
              max={260}
              value={form.heightCm}
              onChange={(e) => u("heightCm", +e.target.value)}
            />
          </Field>
          <Field label="Age">
            <Input
              type="number"
              min={13}
              max={100}
              value={form.age}
              onChange={(e) => u("age", +e.target.value)}
            />
          </Field>
          <Field label="Sex">
            <Seg
              value={form.sex}
              onChange={(v) => u("sex", v as Sex)}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </Field>
          <Field label="Activity">
            <select
              value={form.activity}
              onChange={(e) => u("activity", e.target.value as Activity)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Pace</Label>
          <Seg
            value={form.pace}
            onChange={(v) => u("pace", v as Pace)}
            options={[
              { value: "mild", label: "Mild" },
              { value: "moderate", label: "Moderate" },
              { value: "aggressive", label: "Aggressive" },
            ]}
          />
        </div>
      </div>

      <motion.div
        key={result.targetCalories}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-card p-5 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Big v={result.targetCalories} unit="kcal" label="Daily target" highlight />
          <Big v={result.proteinG} unit="g" label="Protein" />
          <Big v={result.carbsG} unit="g" label="Carbs" />
          <Big v={result.fatG} unit="g" label="Fat" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Mini label="BMR" v={`${result.bmr} kcal`} />
          <Mini label="TDEE" v={`${result.tdee} kcal`} />
          <Mini
            label={
              result.goalDirection === "cut"
                ? "Deficit"
                : result.goalDirection === "bulk"
                  ? "Surplus"
                  : "Maintenance"
            }
            v={`${result.dailyDelta >= 0 ? "+" : ""}${result.dailyDelta} kcal/day`}
          />
        </div>
        {result.goalDirection !== "maintain" && (
          <p className="mt-4 text-center text-sm">
            At this pace you'll reach{" "}
            <span className="font-semibold text-primary">{form.targetWeightKg} kg</span> in about{" "}
            <span className="font-semibold text-primary">{result.weeksToGoal} weeks</span>
            {result.weeksToGoal > 0 && ` (≈${Math.round(result.weeksToGoal / 4)} months)`}.
          </p>
        )}
        {result.warnings.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-2xl bg-destructive/10 p-3 text-xs">
            {result.warnings.map((w) => (
              <li key={w}>⚠️ {w}</li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={ask} disabled={aiBusy} className="flex-1">
            {aiBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Get AI plan
          </Button>
          <Button onClick={save} disabled={saveBusy} variant="outline" className="flex-1">
            {saveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save as my targets
          </Button>
        </div>
      </motion.div>

      {aiPlan && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Your plan
          </h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground">
            {aiPlan}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Seg({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      className="mt-1 grid gap-1 rounded-md bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-2 py-1.5 text-sm transition ${value === o.value ? "bg-card font-semibold text-primary shadow-sm" : "text-muted-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Big({
  v,
  unit,
  label,
  highlight,
}: {
  v: number;
  unit: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl ${highlight ? "bg-primary text-primary-foreground" : "bg-muted"} p-3 text-center`}
    >
      <div className="text-2xl font-bold">{v}</div>
      <div
        className={`text-[10px] uppercase tracking-wider ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}
      >
        {label} · {unit}
      </div>
    </div>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-xl bg-card/60 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{v}</div>
    </div>
  );
}
