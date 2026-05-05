# GrupOS

> Plataforma para gestão e análise inteligente de grupos do WhatsApp — sincronização de mensagens, resumos automáticos com IA e busca semântica via embeddings.

Este projeto é **self-hosted**: cada usuário roda própria instância em Supabase + Vercel. Setup completo em ~15 minutos.

## 🚀 Como rodar (passo a passo)

### Caminho recomendado: setup interativo via Claude Code

Se você tem [Claude Code](https://claude.com/claude-code) instalado, esse é o caminho mais simples — Claude Code te pergunta cada credencial, valida tudo, e configura sua instância sozinho.

1. Crie um projeto novo no Supabase em https://supabase.com/dashboard.
2. Faça fork deste repositório no GitHub.
3. Clone o seu fork localmente: `git clone https://github.com/[seu-usuario]/grupOS.git`
4. Entre na pasta: `cd grupOS`
5. Abra Claude Code: `claude`
6. Abra o arquivo [`BOOTSTRAP.md`](./BOOTSTRAP.md) deste repositório, copie o bloco "Prompt para Claude Code", e cole na sessão.
7. Responda às perguntas — Claude Code aplica migrations, deploya Edge Functions e cria seu admin.
8. Quando terminar, faça deploy do frontend na Vercel preenchendo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Claude Code te lembra dos valores no final).
9. Acesse a URL gerada pela Vercel e faça login com o admin criado.

Veja [`BOOTSTRAP.md`](./BOOTSTRAP.md) para detalhes.

### Caminho manual (sem Claude Code)

Se prefere fazer tudo no terminal:

```bash
git clone https://github.com/[seu-usuario]/grupOS.git
cd grupOS
cp .env.example .env.local
# Edite .env.local preenchendo VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
# SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF (veja comentários no arquivo)
npm install

# Aplica migrations (uma por vez, em ordem)
for f in supabase/migrations/*.sql; do
  node scripts/run-migration.mjs "$SUPABASE_PROJECT_REF" "$f"
done

# Deploya Edge Functions (uma por vez)
for d in supabase/functions/*/; do
  slug=$(basename "$d")
  [[ "$slug" == _* ]] && continue
  node scripts/deploy-function.mjs "$SUPABASE_PROJECT_REF" "$slug"
done
```

> Este projeto não usa secrets configuráveis em Edge Functions — chaves OpenAI/UAZAPI vão pro banco via wizard no primeiro login (não em variáveis de ambiente do servidor).

Crie sua conta admin acessando a aplicação após deploy — o primeiro usuário cadastrado vira admin automaticamente. Para deploy do frontend na Vercel:

1. Acesse https://vercel.com/new e importe seu fork.
2. Na tela de Environment Variables, preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy.

---

## 🧱 Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + componentes estilo shadcn/ui
- Supabase (schema `grupos`, Auth, Edge Functions, pgvector)
- React Router
- Provider WhatsApp: UAZAPI v2
- IA: OpenAI (embeddings + chat completions)

## 📁 Estrutura

```
supabase/
  migrations/          SQL do schema grupos
  functions/           Edge Functions (Deno)
src/
  auth/                AuthContext + ProtectedRoute + RequireAdmin
  components/ui/       Button, Card, Input, Label, Toast
  layout/              AppLayout + Sidebar
  lib/                 Supabase client, UAZAPI client, helpers
  pages/               Login, Grupos, Resumos, Knowledge, Equipe, Configurações
  wizard/              Onboarding multi-step
scripts/               run-migration.mjs, deploy-function.mjs
.github/workflows/     CI (typecheck + build em PRs)
```

## 📚 Documentação adicional

- [`BOOTSTRAP.md`](./BOOTSTRAP.md) — setup interativo via Claude Code

## 📄 Licença

MIT
