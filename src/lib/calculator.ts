export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Pace = "mild" | "moderate" | "aggressive";

const ACTIVITY_MULT: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const PACE_KCAL: Record<Pace, number> = {
  mild: 300,
  moderate: 550,
  aggressive: 800,
};

export interface CalcInput {
  currentWeightKg: number;
  targetWeightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: Activity;
  pace: Pace;
}

export interface CalcResult {
  bmr: number;
  tdee: number;
  goalDirection: "cut" | "bulk" | "maintain";
  targetCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  weeksToGoal: number;
  dailyDelta: number;
  warnings: string[];
}

export function computePlan(i: CalcInput): CalcResult {
  const { currentWeightKg, targetWeightKg, heightCm, age, sex, activity, pace } = i;

  // Mifflin-St Jeor
  const base = 10 * currentWeightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === "male" ? base + 5 : base - 161;
  const tdee = bmr * ACTIVITY_MULT[activity];

  const diff = targetWeightKg - currentWeightKg;
  const direction: CalcResult["goalDirection"] =
    Math.abs(diff) < 1 ? "maintain" : diff < 0 ? "cut" : "bulk";

  const warnings: string[] = [];
  let dailyDelta = direction === "maintain" ? 0 : PACE_KCAL[pace] * (direction === "cut" ? -1 : 1);
  let targetCalories = Math.round(tdee + dailyDelta);

  const floor = sex === "female" ? 1200 : 1500;
  if (targetCalories < floor) {
    const orig = targetCalories;
    targetCalories = floor;
    dailyDelta = targetCalories - Math.round(tdee);
    warnings.push(
      `Calorie target raised from ${orig} to ${floor} kcal — going lower long-term hurts metabolism and muscle.`,
    );
  }

  // Protein g/kg of body weight
  const proteinPerKg = direction === "cut" ? 2.0 : direction === "bulk" ? 1.8 : 1.6;
  const proteinG = Math.round(currentWeightKg * proteinPerKg);

  // Fat ~25% of calories, carbs fill the rest
  const fatG = Math.round((targetCalories * 0.25) / 9);
  const proteinCals = proteinG * 4;
  const fatCals = fatG * 9;
  const carbsG = Math.max(0, Math.round((targetCalories - proteinCals - fatCals) / 4));

  // Time to goal: 1 kg of body fat ≈ 7700 kcal
  let weeksToGoal = 0;
  if (direction !== "maintain" && dailyDelta !== 0) {
    const totalKcal = Math.abs(diff) * 7700;
    const weeklyKcal = Math.abs(dailyDelta) * 7;
    weeksToGoal = Math.ceil(totalKcal / weeklyKcal);
  }

  if (direction === "cut" && pace === "aggressive") {
    warnings.push("Aggressive cuts are hard to sustain — expect strength dips and hunger.");
  }
  if (direction === "bulk" && pace === "aggressive") {
    warnings.push("Fast bulks add fat too. Slow & steady leans cleaner.");
  }

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goalDirection: direction,
    targetCalories,
    proteinG,
    carbsG,
    fatG,
    weeksToGoal,
    dailyDelta: Math.round(dailyDelta),
    warnings,
  };
}
