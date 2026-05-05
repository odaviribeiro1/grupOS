import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 60px auto; color: #F8FAFC; background: #0B1220; border: 1px solid rgba(59,130,246,0.25); border-radius: 16px; line-height: 1.55;">
      <h1 style="margin: 0 0 16px; font-size: 22px;">⚠️ Configuração ausente</h1>
      <p>As variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> não foram encontradas.</p>
      <p><strong>Em produção (Vercel):</strong> configure-as em <em>Project Settings → Environment Variables</em> e faça redeploy.</p>
      <p><strong>Em desenvolvimento local:</strong> copie <code>.env.example</code> para <code>.env.local</code> e preencha com suas credenciais Supabase.</p>
      <p style="margin-top: 20px; opacity: 0.75; font-size: 14px;">Veja o passo a passo completo no <code>README.md</code> do projeto.</p>
    </div>
  `;
  throw new Error(
    "[GrupOS] Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias."
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
