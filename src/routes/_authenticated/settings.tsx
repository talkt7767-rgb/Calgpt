import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAvatarPrefs } from "@/lib/avatar.functions";
import { AvatarCharacter } from "@/components/avatar-character";
import heroSettings from "@/assets/hero-settings.jpg";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    target_calories: 2000,
    target_protein: 150,
    target_carbs: 250,
    target_fat: 70,
  });
  const [avatar, setAvatar] = useState<{
    gender: "male" | "female";
    skin: "light" | "medium" | "deep";
  }>({
    gender: "male",
    skin: "medium",
  });
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const saveAvatar = useServerFn(saveAvatarPrefs);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("target_calories,target_protein,target_carbs,target_fat,avatar_gender,avatar_skin")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          target_calories: data.target_calories,
          target_protein: data.target_protein,
          target_carbs: data.target_carbs,
          target_fat: data.target_fat,
        });
        setAvatar({
          gender: (data.avatar_gender ?? "male") as "male" | "female",
          skin: (data.avatar_skin ?? "medium") as "light" | "medium" | "deep",
        });
      });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Targets saved");
  };

  const persistAvatar = async (next: typeof avatar) => {
    setAvatar(next);
    setAvatarBusy(true);
    try {
      await saveAvatar({ data: { avatar_gender: next.gender, avatar_skin: next.skin } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save avatar");
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <img
          src={heroSettings}
          alt=""
          loading="lazy"
          className="h-32 w-full object-cover md:h-40"
          width={640}
          height={160}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="mb-3 font-semibold">
          Your avatar{" "}
          {avatarBusy && <span className="text-xs text-muted-foreground">· saving…</span>}
        </h2>
        <div className="flex flex-col items-center gap-4">
          <AvatarCharacter
            stage={3}
            gender={avatar.gender}
            skin={avatar.skin}
            showTips={false}
            compact
          />
          <div className="w-full space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Gender</Label>
              <div className="mt-1 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => persistAvatar({ ...avatar, gender: g })}
                    className={`rounded px-3 py-1.5 text-sm transition ${avatar.gender === g ? "bg-card font-semibold text-primary shadow-sm" : "text-muted-foreground"}`}
                  >
                    {g === "male" ? "Male" : "Female"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Skin tone</Label>
              <div className="mt-1 grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
                {(["light", "medium", "deep"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => persistAvatar({ ...avatar, skin: s })}
                    className={`rounded px-3 py-1.5 text-sm capitalize transition ${avatar.skin === s ? "bg-card font-semibold text-primary shadow-sm" : "text-muted-foreground"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-semibold">Daily nutrition targets</h2>
        <p className="text-xs text-muted-foreground">
          Tip: use the{" "}
          <Link to="/calculator" className="text-primary underline">
            goal calculator
          </Link>{" "}
          to auto-fill these.
        </p>
        {(
          [
            ["target_calories", "Calories (kcal)"],
            ["target_protein", "Protein (g)"],
            ["target_carbs", "Carbs (g)"],
            ["target_fat", "Fat (g)"],
          ] as const
        ).map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Input
              type="number"
              min={0}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
            />
          </div>
        ))}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving…" : "Save targets"}
        </Button>
      </form>

      <div className="flex gap-2">
        <Link
          to="/history"
          className="flex-1 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-center text-sm font-medium transition-colors flex items-center justify-center"
        >
          View history
        </Link>
        <Button
          variant="outline"
          className="flex-1"
          onClick={async () => {
            await signOut();
            nav({ to: "/" });
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
