# BOOTSTRAP — Setup interativo via Claude Code

> Este arquivo contém um prompt pronto para você colar em uma sessão de Claude Code rodando na pasta deste repositório recém-clonado.
>
> Em ~10 minutos, Claude Code vai te perguntar suas credenciais uma a uma, configurar o projeto Supabase, aplicar todas as migrations, deployar as Edge Functions, criar sua conta de admin, e te entregar o passo final do deploy do frontend na Vercel.
>
> Pré-requisitos: Node 20+, Claude Code instalado e autorizado, git, e este repositório clonado.

---

## Como usar

1. Crie um projeto novo no Supabase em https://supabase.com/dashboard. Anote o Project Reference (em Project Settings → General).
2. Crie um Personal Access Token Supabase em https://supabase.com/dashboard/account/tokens. Marque escopo "All access". Anote o token.
3. Tenha em mãos as credenciais que serão pedidas (lista abaixo).
4. Abra um terminal na raiz deste repositório.
5. Execute `claude` (precisa estar instalado e autorizado).
6. Cole o prompt completo abaixo (a partir da linha "Prompt para Claude Code") na sessão.
7. Responda às perguntas conforme Claude Code as faz, uma a uma.

---

## Credenciais que serão pedidas

- **Supabase URL** — formato `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`. Em Project Settings → API → Project URL.
- **Supabase anon key** — JWT longo. Em Project Settings → API → Project API keys → `anon` `public`.
- **Supabase service_role key** — JWT longo (sigiloso). Em Project Settings → API → Project API keys → `service_role` `secret`.
- **Supabase Project Reference** — código tipo `abcdefghijklmnopqrst`. Em Project Settings → General → Reference ID.
- **Supabase Personal Access Token** — formato `sbp_...`. Em https://supabase.com/dashboard/account/tokens.
- **Email e senha** que você vai usar como admin desta instância.

> Observação: este projeto **não** requer chaves de provedores externos (OpenAI, UAZAPI) em variáveis de ambiente do servidor. Essas chaves são salvas por usuário no banco durante o onboarding pós-login (passo via wizard). O Bootstrap aqui só cuida da infra Supabase + admin.

---

## Prompt para Claude Code

> Cole tudo abaixo desta linha na sessão Claude Code aberta na raiz deste repositório.

Você é responsável por configurar este projeto self-hosted (GrupOS — plataforma para análise de grupos do WhatsApp) na infraestrutura Supabase do usuário (aluno). O fluxo é interativo: pedir uma credencial por vez, validar imediatamente, e só ao final aplicar mudanças no Supabase do usuário.

### Princípios

1. **Interativo, uma pergunta por vez.** Não pedir bloco gigante de credenciais.
2. **Validar antes de prosseguir.** Toda credencial recebida deve ser testada (URL responde, anon key autentica, access token tem permissão).
3. **Nada fica em arquivo permanente até validar.** Manter credenciais em variáveis da sessão até o final.
4. **Resumo antes de aplicar.** No final, listar tudo que vai ser feito e pedir confirmação ("digite SIM para prosseguir").
5. **Mensagens curtas e claras** em pt-BR. Sem postâmbulos longos.
6. **Erros são oportunidade de retry**, não de abandono. Se uma credencial falhar validação, pedir de novo com explicação clara do que está errado.

### Pré-checagem

1. Confirmar `node --version` retorna 20+.
2. Confirmar `pwd` está na raiz do repositório (existe `package.json` com `"name": "grupos"` e pasta `supabase/`).
3. `git status` deve estar limpo.
4. Ler `.env.example` na raiz e confirmar os 3 grupos: Frontend (`VITE_*`), Edge Functions Secrets (vazio para este projeto), Scripts/Local.
5. Listar `supabase/migrations/*.sql` em ordem alfabética e `supabase/functions/*/` (slugs das funções).

### Sequência interativa

#### Passo 1 — Apresentação

Mostre ao aluno em uma única mensagem:
- Projeto detectado: **GrupOS** (`grupos` em package.json)
- Lista de migrations encontradas: <listar arquivos `supabase/migrations/*.sql`>
- Lista de Edge Functions encontradas: <listar slugs em `supabase/functions/`>
- Variáveis a configurar: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Vercel) + admin (email/senha)
- Aviso: "Vou pedir cada credencial uma por vez. Você pode pausar e retomar — nada é gravado até a confirmação final."

Aguarde "ok" / "vai" / "pode" antes de prosseguir.

#### Passo 2 — Supabase URL

Perguntar: "Cole sua Supabase URL (formato `https://xxxx.supabase.co`)."

Validar:
- Regex `^https://[a-z0-9]{20,}\.supabase\.co$`
- `curl -sI {URL}/rest/v1/ -H "apikey: dummy"` → esperado `401` (confirma que a URL existe).

#### Passo 3 — Supabase anon key

Perguntar: "Cole sua Supabase anon key (começa com `eyJ`)."

Validar:
- Começa com `eyJ`.
- `curl -s {URL}/rest/v1/ -H "apikey: {ANON_KEY}"` → esperado `200` ou JSON válido (não `401`).

#### Passo 4 — Supabase service_role key

Perguntar: "Cole sua Supabase service_role key. Atenção: dá acesso total ao banco — mantenha sigilo."

Validar:
- Começa com `eyJ`.
- Decodificar JWT (sem assinatura) e checar `role === 'service_role'`:
  ```bash
  node -e "console.log(JSON.parse(Buffer.from(process.argv[1].split('.')[1],'base64').toString()))" "{KEY}"
  ```

#### Passo 5 — Supabase Project Reference

Perguntar: "Cole o Project Reference do seu projeto Supabase (ex.: `abcdefghijklmnopqrst`)."

Validar:
- Regex `^[a-z]{20}$`.
- Confirmar que a URL anterior contém esse ref como subdomínio.

#### Passo 6 — Supabase Personal Access Token

Perguntar: "Cole seu Personal Access Token Supabase (formato `sbp_...`). Crie em https://supabase.com/dashboard/account/tokens se ainda não tem."

Validar:
- Começa com `sbp_`.
- Management API:
  ```bash
  curl -s https://api.supabase.com/v1/projects/{PROJECT_REF} \
    -H "Authorization: Bearer {ACCESS_TOKEN}"
  ```
  Deve retornar JSON com dados do projeto.

Se `401`: "Token sem acesso ao projeto. Verifique escopo `All access` e Project Ref correto."

#### Passo 7 — Edge Functions Secrets

**Pular este passo.** Este projeto não usa secrets de Edge Functions configuráveis em runtime — leia o `.env.example` para confirmar (a seção "EDGE FUNCTIONS SECRETS" diz explicitamente que não há nada para configurar).

Mostre ao aluno: "Este projeto não requer secrets adicionais nas Edge Functions. As chaves OpenAI/UAZAPI são salvas por usuário no banco durante o wizard pós-login. Pulando esta etapa."

#### Passo 8 — Conta admin

Perguntar (uma a uma):
1. "Email do admin desta instância:" — validar formato.
2. "Senha do admin (mínimo 8 caracteres):" — validar comprimento.

#### Passo 9 — Resumo e confirmação

Em uma mensagem única, mostrar:
- ✅ Supabase URL: `[mostrar truncado]`
- ✅ Anon key: `[primeiros 12 chars]...`
- ✅ Service role: `[primeiros 12 chars]...`
- ✅ Project ref: `[ref]`
- ✅ Access token: `[primeiros 8 chars]...`
- ✅ Admin: `[email]`

Listar **as ações que serão executadas** em ordem:

1. Criar arquivo `.env.local` na raiz com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEV_MODE=false`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.
2. Rodar `npm install` se `node_modules/` não existir.
3. Aplicar migrations: para cada `supabase/migrations/*.sql` em ordem alfabética, rodar:
   ```bash
   SUPABASE_ACCESS_TOKEN={TOKEN} node scripts/run-migration.mjs {PROJECT_REF} {file}
   ```
   (Este projeto não tem npm script `db:push` — usa o `node scripts/run-migration.mjs` direto.)
4. Deploy de Edge Functions: para cada slug em `supabase/functions/*/`, rodar:
   ```bash
   SUPABASE_ACCESS_TOKEN={TOKEN} node scripts/deploy-function.mjs {PROJECT_REF} {slug}
   ```
5. Criar usuário admin via Supabase Auth Admin API.
6. Validar que o trigger de "primeiro user vira admin" funcionou (consultar `grupos.users` ou tabela equivalente do schema).

Pedir confirmação: "Digite SIM (em maiúsculas) para executar tudo acima. Qualquer outra coisa cancela e nenhuma mudança é feita."

#### Passo 10 — Execução

Apenas se a resposta for exatamente `SIM`:

**10.1 — Escrever `.env.local`**

```
VITE_SUPABASE_URL={URL}
VITE_SUPABASE_ANON_KEY={ANON}
VITE_DEV_MODE=false
SUPABASE_ACCESS_TOKEN={TOKEN}
SUPABASE_PROJECT_REF={REF}
```

Confirmar que `.env.local` está no `.gitignore`.

**10.2 — `npm install` se necessário**

Se `node_modules/` não existe: `npm install`. Mostrar saída resumida.

**10.3 — Aplicar migrations**

Listar os arquivos com `ls supabase/migrations/*.sql | sort`. Para cada arquivo, executar:

```bash
SUPABASE_ACCESS_TOKEN={TOKEN} node scripts/run-migration.mjs {PROJECT_REF} {file}
```

Capturar saída. Em erro, oferecer retry/skip/abort para esse arquivo. Continuar com os próximos só se anterior teve sucesso ou foi explicitamente skipped.

**10.4 — Deploy de Edge Functions**

Listar slugs: `ls -d supabase/functions/*/ | xargs -n1 basename`. Para cada slug (pulando os que começam com `_`):

```bash
SUPABASE_ACCESS_TOKEN={TOKEN} node scripts/deploy-function.mjs {PROJECT_REF} {slug}
```

Mesma lógica de erro do passo 10.3.

**10.5 — Configurar secrets via Management API**

**Pular.** Este projeto não tem secrets para configurar.

**10.6 — Criar admin**

Supabase Auth Admin API:

```bash
curl -X POST "{SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: {SERVICE_ROLE}" \
  -H "Authorization: Bearer {SERVICE_ROLE}" \
  -H "Content-Type: application/json" \
  -d '{"email":"{EMAIL}","password":"{SENHA}","email_confirm":true}'
```

Esperado: `200` com `id` de usuário no JSON.

**10.7 — Validar trigger de admin**

Aguardar 2-3s. Consultar via Management API:

```bash
curl -s "{SUPABASE_URL}/rest/v1/users?email=eq.{EMAIL}&select=id,role" \
  -H "apikey: {SERVICE_ROLE}" \
  -H "Authorization: Bearer {SERVICE_ROLE}"
```

> Nota: esta tabela está no schema `grupos`. Se o REST API não expõe o schema diretamente, pode precisar usar a Management API SQL endpoint:
> ```bash
> curl -s "https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query" \
>   -H "Authorization: Bearer {ACCESS_TOKEN}" \
>   -H "Content-Type: application/json" \
>   -d '{"query":"SELECT id, role FROM grupos.users WHERE email = '\''{EMAIL}'\'';"}'
> ```

Confirmar role `admin` (ou nomenclatura equivalente do schema). Se não for, alertar mas não falhar — o schema pode ter promoção de admin via fluxo diferente.

#### Passo 11 — Relatório final

Mostrar ao aluno em uma única mensagem:

```
✅ Setup concluído!

📊 Configurado:
- Migrations aplicadas: N (lista os arquivos)
- Edge Functions deployadas: N (lista os slugs)
- Admin criado: [email]

📋 Próximos passos:

1. Deploy do frontend na Vercel:
   - Acesse https://vercel.com/new
   - Importe seu fork
   - Na tela de Environment Variables, preencha:
     • VITE_SUPABASE_URL = {URL}
     • VITE_SUPABASE_ANON_KEY = {ANON_KEY}
     • VITE_DEV_MODE = false
   - Clique em Deploy
   - Aguarde ~2 minutos

2. Acesse a URL gerada pela Vercel.
3. Faça login com o email e senha de admin que você acabou de definir.
4. Complete o onboarding (wizard) inserindo:
   - Credenciais UAZAPI (URL + token) para conectar ao WhatsApp
   - Sua chave OpenAI para resumos e busca semântica
   - QR Code do WhatsApp
   - Seleção dos grupos a sincronizar
5. Pronto — sua instância está rodando!

Em caso de problema, abra issue em https://github.com/[upstream-owner]/[repo].
```

### Tratamento de erros gerais

- Em qualquer falha, mostrar o erro completo e oferecer 3 opções: retry, pular esta etapa, abortar tudo.
- Se abortar antes do passo 10.1: nenhuma mudança foi feita.
- Se abortar entre 10.1 e 10.4: pode ter `.env.local` criado e migrations parcialmente aplicadas. Avisar o aluno.
- Se abortar depois de 10.4: instância parcialmente configurada — melhor terminar manualmente.

### Princípio final

Você está tocando na infra de produção do aluno. **Cuidado, transparência e confirmação explícita** são mais importantes que velocidade.
