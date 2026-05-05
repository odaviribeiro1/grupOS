import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "[GrupOS] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. " +
      "Configure-as em Vercel → Settings → Environment Variables (produção) ou no arquivo .env.local (dev). Veja README.md."
  );
}

export const supabase = createClient(url, anonKey, {
  db: { schema: "grupos" },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
