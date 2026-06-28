import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Camera, Sparkles, Activity, Calculator } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  AvatarCharacter,
  computeAvatarStage,
  type AvatarGender,
} from "@/components/avatar-character";
import logo from "@/assets/calgpt-logo.png";
import heroMeals from "@/assets/hero-meals.jpg";
import heroProducts from "@/assets/hero-products.jpg";
import heroConsult from "@/assets/hero-consult.jpg";

const LANDING_VIDEO = "/landing-hero.mp4";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      {
        name: "google-site-verification",
        content: "googledfb65048673da642",
      },
    ],
    links: [
      {
        rel: "preload",
        href: heroMeals,
        as: "image",
        fetchpriority: "high",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Calgpt",
          "operatingSystem": "All",
          "applicationCategory": "HealthApplication",
          "offers": {
            "@type": "Offer",
            "price": "0.00",
            "priceCurrency": "USD",
          },
          "description":
            "An AI-powered nutrition coach and macro tracker. Scan food labels, take pictures of meals for macro estimates, and track your virtual self.",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "124",
          },
        }),
      },
    ],
  }),
});

function Landing() {
  const { user, loading } = useAuth();
  const [demoDays, setDemoDays] = useState(0);
  const [demoGender, setDemoGender] = useState<AvatarGender>("male");
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    setVideoSrc(LANDING_VIDEO);
  }, []);

  const stage = computeAvatarStage({
    daysLogged: demoDays,
    avgProteinPct: demoDays / 7,
    avgCaloriePct: demoDays / 7,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <img
            src={logo}
            alt="Cal Gpt"
            className="h-9 w-9 rounded-xl object-cover"
            width={36}
            height={36}
          />
          <span className="font-bold text-lg">Cal Gpt</span>
        </div>
        <div className="flex gap-2">
          {!loading && user ? (
            <Link
              to="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground sm:px-4"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-2xl">
          <video
            src={videoSrc || undefined}
            poster={heroMeals}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="h-[360px] w-full object-cover sm:h-[460px] md:h-[520px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-end p-6 pb-12 text-center md:pb-20"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              AI Nutrition Coach: Snap, Scan & <span className="text-primary">Track.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
              Your AI nutrition coach. Photo-log meals, rate packaged foods, and watch your virtual
              self transform.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                to="/signup"
                className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow-lg"
              >
                Get started — free
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-border bg-card px-5 py-3 font-medium"
              >
                I have an account
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Avatar demo */}
        <section className="mt-12 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Meet your future self</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Slide to see how logging meals consistently changes your physique — and what happens
              if you don't.
            </p>
          </div>
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="flex justify-center">
              <AvatarCharacter stage={stage} gender={demoGender} skin="medium" />
            </div>
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Days logged this week</span>
                  <span className="font-bold text-primary">{demoDays} / 7</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={7}
                  step={1}
                  value={demoDays}
                  onChange={(e) => setDemoDays(+e.target.value)}
                  className="w-full accent-primary"
                  aria-label="Days logged"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Skipping</span>
                  <span>Casual</span>
                  <span>Locked in</span>
                </div>
              </div>
              <div>
                <Label2>Show me as</Label2>
                <div className="mt-1 grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setDemoGender(g)}
                      className={`rounded px-3 py-1.5 text-sm transition ${demoGender === g ? "bg-card font-semibold text-primary shadow-sm" : "text-muted-foreground"}`}
                    >
                      {g === "male" ? "Male" : "Female"}
                    </button>
                  ))}
                </div>
              </div>
              <Link
                to="/signup"
                className="block rounded-xl bg-primary px-5 py-3 text-center font-medium text-primary-foreground shadow-lg"
              >
                Start tracking — free
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {[
            {
              icon: Camera,
              title: "Photo meal logging",
              body: "Snap your plate. AI estimates calories and macros instantly.",
              img: heroMeals,
              alt: "AI meal photo analysis and nutrition macro estimation",
            },
            {
              icon: Sparkles,
              title: "Product health scores",
              body: "Scan front + ingredients to get a 0–10 rating and safer alternatives.",
              img: heroProducts,
              alt: "AI scan of food product label ingredients showing health rating",
            },
            {
              icon: Calculator,
              title: "Goal calculator",
              body: "BMR + TDEE + protein needs in one tap. AI plans the rest.",
              img: heroProducts,
              alt: "AI nutrition macro calculator target setting dashboard",
            },
            {
              icon: Activity,
              title: "Live AI coach",
              body: "Ask anything — meal plans, ingredient checks, daily targets.",
              img: heroConsult,
              alt: "Interactive chat conversation with a personal AI nutrition coach",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <img
                src={f.img}
                alt={f.alt}
                loading="lazy"
                className="h-32 w-full object-cover"
                width={300}
                height={128}
              />
              <div className="p-5">
                <f.icon className="h-7 w-7 text-primary" />
                <h3 className="mt-2 font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="mt-20 border-t border-border bg-card py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Cal Gpt Logo"
              className="h-6 w-6 rounded-md object-cover"
              width={24}
              height={24}
            />
            <span className="font-semibold text-foreground">Cal Gpt</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/login" className="hover:text-foreground">Log In</Link>
            <Link to="/signup" className="hover:text-foreground">Sign Up</Link>
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:text-foreground">Sitemap</a>
          </div>
          <p>© {new Date().getFullYear()} Cal Gpt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function Label2({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-wider text-muted-foreground">{children}</div>;
}
