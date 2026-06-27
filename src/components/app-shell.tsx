import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Home, Camera, MessageCircle, Settings, Utensils, Package, Calculator, History } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import logo from "@/assets/calgpt-logo.png";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/scan/meal", label: "Meal", icon: Utensils },
  { to: "/scan/product", label: "Product", icon: Package },
  { to: "/calculator", label: "Goals", icon: Calculator },
  { to: "/history", label: "History", icon: History },
  { to: "/consult", label: "Consult", icon: MessageCircle },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const loc = useLocation();
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img
              src={logo}
              alt="Cal Gpt"
              className="h-9 w-9 rounded-xl object-cover"
              width={36}
              height={36}
            />
            <span className="font-bold text-lg tracking-tight">Cal Gpt</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => {
              const active = loc.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <motion.main
        key={loc.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-8"
      >
        <Outlet />
      </motion.main>

      {/* mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {[
            navItems[0],
            { to: "#", label: "Scan", icon: Camera, action: true },
            navItems[3],
            navItems[5],
            navItems[6],
          ].map((n: any) => {
            const Icon = n.icon;
            if (n.action) {
              return (
                <button
                  key="scan"
                  onClick={() => setScanOpen(true)}
                  className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                </button>
              );
            }
            const active = loc.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {scanOpen && (
        <div
          onClick={() => setScanOpen(false)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:hidden"
        >
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-10"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h3 className="mb-3 text-center font-semibold">What do you want to scan?</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/scan/meal"
                onClick={() => setScanOpen(false)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-primary/10 p-4 text-primary"
              >
                <Utensils className="h-8 w-8" />
                <span className="font-medium">Meal</span>
              </Link>
              <Link
                to="/scan/product"
                onClick={() => setScanOpen(false)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-accent p-4"
              >
                <Package className="h-8 w-8" />
                <span className="font-medium">Product</span>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
