import { useEffect, useState } from "react";
import { Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function MealThumb({ path, fallbackUrl }: { path: string; fallbackUrl?: string | null }) {
  const [url, setUrl] = useState<string | null>(fallbackUrl || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (fallbackUrl) {
      setUrl(fallbackUrl);
      return;
    }
    if (!path) return;
    supabase.storage
      .from("meal-photos")
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null))
      .catch(() => setError(true));
  }, [path, fallbackUrl]);

  return (
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-muted">
      {url && !error ? (
        <img
          src={url}
          className="h-full w-full object-cover"
          alt=""
          width={48}
          height={48}
          onError={() => setError(true)}
        />
      ) : (
        <Utensils className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}
