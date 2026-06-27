# Calgpt: AI-Powered Nutrition Coach & Macro Tracker

Calgpt is a modern, state-of-the-art web application designed to help users track their nutrition, calculate goal-specific macronutrient targets, chat with an AI coach, and see a dynamic avatar react to their daily progress. 

Powered by **TanStack Start** and **Supabase**, Calgpt uses **Google Gemini AI** for advanced meal photo and food product label analysis.

---

## 🚀 Key Features

*   **📊 Interactive Dashboard**: Visual rings for calories, protein, carbs, and fat. View monthly averages, product scan counts, and recently logged meals.
*   **📸 AI Meal Analyzer**: Take a photo of your meal. The system uses Gemini to identify the dish, list individual ingredients, and estimate macros (calories, protein, carbs, fat).
*   **🔎 AI Product Label Scanner**: Scan the front and ingredients label of packaged foods to receive a health rating (0–10), list of safe vs. harmful additives, and 3 healthier alternatives.
*   **💬 AI Nutrition Consultant**: Chat with a pragmatic AI nutrition coach who knows your active profile, weight goals, and recent meal logs.
*   **⚖️ Nutrition & Goal Calculator**: Instantly computes BMR (Mifflin-St Jeor) and TDEE based on activity levels. Generates calorie/macro targets and estimates weeks to target weight. Includes a "Get AI Plan" button for customized weekly tips.
*   **👤 Reacting Avatar (5 Stages)**: A personal avatar (`skeletal`, `weak`, `average`, `fit`, `peak`) that morphs based on your logging frequency and macro goals. Includes a settings picker for gender and skin tone.
*   **🧼 Monthly Storage Auto-Cleanup**: A background worker route (`/api/public/hooks/wipe-monthly-photos`) triggered on the 1st of every month to remove old images from Supabase Storage while preserving data rows.

---

## 🛠️ Technology Stack

*   **Frontend**: React (v19), TailwindCSS (v4), Framer Motion, Radix UI, Lucide Icons, Recharts, Sonner (Toasts)
*   **Routing & SSR**: [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (file-based routing, server functions, SSR)
*   **Database & Storage**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Storage Buckets, Auth)
*   **AI Gateway**: Google Gemini 2.5/3.5 Flash
*   **Runtime**: Node.js / Bun / Cloudflare Wrangler

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root directory (already ignored by `.gitignore` to prevent leaking keys):

```env
# Supabase Configuration
SUPABASE_PROJECT_ID="your_supabase_project_id"
SUPABASE_URL="https://your_supabase_project_id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_publishable_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key" # Server-only (Do NOT expose to client)

# AI Configuration
GEMINI_API_KEY="your_gemini_api_key" # Server-only (Do NOT expose to client)

# Security Secrets
WIPE_SECRET_KEY="your_wipe_secret_key" # Server-only (Do NOT expose to client)
```

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build & Preview Production
```bash
npm run build
npm run preview
```

### 4. Deploying to Cloudflare (Vite / Wrangler)
Configure your `wrangler.jsonc` and run:
```bash
npx wrangler deploy
```

---

## 🔒 Security & Backend Architecture

To ensure data integrity and confidentiality:
1.  **Server Functions**: All operations involving API keys (Gemini, Supabase Admin service role, cron secret) are executed strictly on the server-side via `createServerFn`. 
2.  **No Exposed Client Secrets**: The browser only communicates with the backend server endpoints. The `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are never exposed to the client bundle.
3.  **Local Git Protection**: The `.env` file is excluded from repository tracking using `.gitignore` to prevent secret leaks.
