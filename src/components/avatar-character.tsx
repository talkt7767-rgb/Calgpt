import { motion } from "framer-motion";
import { AlertTriangle, Heart, TrendingDown, Zap } from "lucide-react";

import m1 from "@/assets/avatar/m-1-skeletal.png";
import m2 from "@/assets/avatar/m-2-weak.png";
import m3 from "@/assets/avatar/m-3-average.png";
import m4 from "@/assets/avatar/m-4-fit.png";
import m5 from "@/assets/avatar/m-5-peak.png";
import f1 from "@/assets/avatar/f-1-skeletal.png";
import f2 from "@/assets/avatar/f-2-weak.png";
import f3 from "@/assets/avatar/f-3-average.png";
import f4 from "@/assets/avatar/f-4-fit.png";
import f5 from "@/assets/avatar/f-5-peak.png";

export type AvatarStage = 1 | 2 | 3 | 4 | 5;
export type AvatarGender = "male" | "female";
export type AvatarSkin = "light" | "medium" | "deep";

const IMAGES: Record<AvatarGender, Record<AvatarStage, string>> = {
  male: { 1: m1, 2: m2, 3: m3, 4: m4, 5: m5 },
  female: { 1: f1, 2: f2, 3: f3, 4: f4, 5: f5 },
};

const SKIN_FILTER: Record<AvatarSkin, string> = {
  light: "brightness(1.08) saturate(0.92)",
  medium: "none",
  deep: "brightness(0.78) saturate(1.12) hue-rotate(-6deg)",
};

const STAGE_META: Record<
  AvatarStage,
  { label: string; tone: string; tips: string[]; ring: string }
> = {
  1: {
    label: "Critically under-fueled",
    tone: "text-destructive",
    ring: "ring-destructive/40",
    tips: [
      "You look exhausted at work and in photos.",
      "Friends notice the energy drop before you do.",
      "Sleep and mood both suffer when you skip meals.",
    ],
  },
  2: {
    label: "Running on empty",
    tone: "text-orange-600",
    ring: "ring-orange-400/40",
    tips: [
      "Concentration dips by mid-afternoon.",
      "Workouts feel harder than they should.",
      "Skin and hair start looking dull.",
    ],
  },
  3: {
    label: "Holding steady",
    tone: "text-muted-foreground",
    ring: "ring-border",
    tips: ["You're maintaining. Hit protein consistently to start building."],
  },
  4: {
    label: "Looking strong",
    tone: "text-primary",
    ring: "ring-primary/40",
    tips: ["People are starting to comment on how good you look."],
  },
  5: {
    label: "Peak physique",
    tone: "text-emerald-600",
    ring: "ring-emerald-400/40",
    tips: ["You're the friend everyone asks for advice. Keep it up."],
  },
};

export interface AvatarCharacterProps {
  stage: AvatarStage;
  gender?: AvatarGender;
  skin?: AvatarSkin;
  showTips?: boolean;
  compact?: boolean;
}

export function AvatarCharacter({
  stage,
  gender = "male",
  skin = "medium",
  showTips = true,
  compact = false,
}: AvatarCharacterProps) {
  const meta = STAGE_META[stage];
  const src = IMAGES[gender][stage];
  const Icon = stage <= 2 ? AlertTriangle : stage === 3 ? Heart : stage === 4 ? Zap : TrendingDown;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        key={`${gender}-${stage}`}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-accent/30 to-card p-3 ring-2 ${meta.ring} ${compact ? "w-40" : "w-full max-w-[280px]"}`}
      >
        <img
          src={src}
          alt={`Stage ${stage} avatar`}
          className="mx-auto h-auto w-full select-none"
          style={{ filter: SKIN_FILTER[skin], aspectRatio: "512/768" }}
          width={512}
          height={768}
          draggable={false}
        />
      </motion.div>

      <div className="text-center">
        <div
          className={`flex items-center justify-center gap-1.5 text-sm font-semibold ${meta.tone}`}
        >
          <Icon className="h-4 w-4" />
          <span>{meta.label}</span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Stage {stage} / 5
        </div>
      </div>

      {showTips && stage <= 2 && (
        <ul className="w-full max-w-[280px] space-y-1 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-foreground">
          {meta.tips.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-destructive">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
      {showTips && stage >= 4 && (
        <p className="max-w-[280px] rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center text-xs">
          {meta.tips[0]}
        </p>
      )}
    </div>
  );
}

/** Maps last-7-day stats to a 1-5 stage. */
export function computeAvatarStage({
  daysLogged,
  avgProteinPct,
  avgCaloriePct,
}: {
  daysLogged: number;
  avgProteinPct: number; // 0..1+
  avgCaloriePct: number; // 0..1+
}): AvatarStage {
  if (daysLogged === 0) return 1;
  if (daysLogged <= 2 || avgProteinPct < 0.4) return 2;
  if (daysLogged <= 4) return 3;
  if (daysLogged <= 6 && avgProteinPct >= 0.7 && avgCaloriePct >= 0.7) return 4;
  if (daysLogged >= 6 && avgProteinPct >= 0.85 && avgCaloriePct >= 0.85) return 5;
  return 3;
}
