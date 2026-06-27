import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MealThumb } from "@/components/meal-thumb";
import heroHistory from "@/assets/hero-history.jpg";

export const Route = createFileRoute("/_authenticated/history")({ component: HistoryPage });

function HistoryPage() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [openMeal, setOpenMeal] = useState<any | null>(null);
  const [openProduct, setOpenProduct] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("meals")
      .select("*")
      .order("logged_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Meals: ${error.message}`);
        setMeals(data ?? []);
      });
    supabase
      .from("product_scans")
      .select("*")
      .order("scanned_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Products: ${error.message}`);
        setProducts(data ?? []);
      });
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-border">
        <img
          src={heroHistory}
          alt=""
          loading="lazy"
          className="h-32 w-full object-cover md:h-40"
          width={640}
          height={160}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-xs text-muted-foreground">Everything you've logged and scanned.</p>
        </div>
      </div>
      <Tabs defaultValue="meals">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        <TabsContent value="meals" className="space-y-2 mt-4">
          {meals.length === 0 && <p className="text-sm text-muted-foreground">No meals yet.</p>}
          {meals.map((m) => (
            <button
              key={m.id}
              onClick={() => setOpenMeal(m)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
            >
              <MealThumb path={m.image_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.logged_at).toLocaleString()} · {Math.round(m.calories)} kcal
                </p>
              </div>
            </button>
          ))}
        </TabsContent>
        <TabsContent value="products" className="space-y-2 mt-4">
          {products.length === 0 && (
            <p className="text-sm text-muted-foreground">No product scans yet.</p>
          )}
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpenProduct(p)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3 text-left"
            >
              <div>
                <p className="font-medium">{p.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.scanned_at).toLocaleString()}
                </p>
              </div>
              <span className="rounded-lg bg-primary/10 px-2 py-1 text-sm font-bold text-primary">
                {p.verdict_score}/10
              </span>
            </button>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!openMeal} onOpenChange={() => setOpenMeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openMeal?.description}</DialogTitle>
          </DialogHeader>
          {openMeal && (
            <div className="space-y-3">
              <SignedImage bucket="meal-photos" path={openMeal.image_url} />
              <p className="text-sm text-muted-foreground">
                {new Date(openMeal.logged_at).toLocaleString()}
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ["kcal", openMeal.calories],
                  ["P", openMeal.protein],
                  ["C", openMeal.carbs],
                  ["F", openMeal.fat],
                ].map(([l, v]: any) => (
                  <div key={l} className="rounded-xl bg-muted p-2">
                    <div className="font-bold">{Math.round(v)}</div>
                    <div className="text-xs">{l}</div>
                  </div>
                ))}
              </div>
              {openMeal.items?.length > 0 && (
                <p className="text-sm">Items: {openMeal.items.join(", ")}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!openProduct} onOpenChange={() => setOpenProduct(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openProduct?.product_name}</DialogTitle>
          </DialogHeader>
          {openProduct && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <SignedImage bucket="product-photos" path={openProduct.product_image_url} small />
                <SignedImage bucket="product-photos" path={openProduct.label_image_url} small />
              </div>
              <p>
                <strong>{openProduct.verdict}</strong> — score {openProduct.verdict_score}/10
              </p>
              <p className="text-muted-foreground">{openProduct.summary}</p>
              {openProduct.harmful_items?.length > 0 && (
                <div>
                  <h4 className="font-semibold">Harmful</h4>
                  <ul>
                    {openProduct.harmful_items.map((i: any) => (
                      <li key={i.name}>
                        • {i.name} — {i.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {openProduct.safe_items?.length > 0 && (
                <div>
                  <h4 className="font-semibold">Good</h4>
                  <ul>
                    {openProduct.safe_items.map((i: any) => (
                      <li key={i.name}>
                        • {i.name} — {i.benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {openProduct.alternatives?.length > 0 && (
                <div>
                  <h4 className="font-semibold">Alternatives</h4>
                  <ul>
                    {openProduct.alternatives.map((a: any) => (
                      <li key={a.name}>
                        • {a.name} ({a.brand}) — {a.key_benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SignedImage({ bucket, path, small }: { bucket: string; path: string; small?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [bucket, path]);
  return (
    <div
      className={
        small
          ? "h-32 flex-1 overflow-hidden rounded-xl bg-muted"
          : "aspect-video w-full overflow-hidden rounded-xl bg-muted"
      }
    >
      {url && (
        <img
          src={url}
          className="h-full w-full object-cover"
          alt=""
          width={small ? 200 : 400}
          height={small ? 128 : 225}
        />
      )}
    </div>
  );
}
