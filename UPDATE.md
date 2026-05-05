# UPDATE — Atualizar sua instância

> Use este arquivo sempre que quiser puxar a versão mais recente do projeto upstream e aplicá-la na sua instância.

## Como usar

1. No GitHub, vá no seu fork e clique em **"Sync fork"** (botão no topo) — isso traz os commits novos do upstream para sua main.
2. No terminal, dentro da pasta do projeto: `git pull`
3. Abra Claude Code: `claude`
4. Digite na sessão: **"Leia o arquivo UPDATE.md e execute tudo"**
5. Aguarde — Claude Code aplica migrations novas, redeploya Edge Functions e valida.

A Vercel detecta o push na main do fork e redeploya o frontend automaticamente.

---

## Instruções para Claude Code

> A partir daqui, este arquivo é lido pelo Claude Code do aluno e contém as instruções que **você (Claude Code) deve executar** quando o aluno disser "Leia o arquivo UPDATE.md e execute tudo".

Você está atualizando uma instância já configurada do **GrupOS**. Pré-requisitos: existe `.env.local` na raiz com `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` válidos (criados no setup inicial via START.md).

### Pré-checagem

1. Confirmar que `.env.local` existe e contém `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF`. Se faltar, instruir o aluno a rodar START.md primeiro.
2. `git status` deve estar limpo. Se tiver modificações locais fora de `src/customizations/`, alertar e pedir orientação (essas modificações podem causar conflito futuro).
3. Mostrar ao aluno os commits novos: `git log HEAD@{1}..HEAD --oneline` (commits puxados desde o último update). Se vazio, avisar que não há nada novo e parar.
4. Detectar mudanças relevantes:
   - Novas migrations: `git diff --name-only HEAD@{1} HEAD -- supabase/migrations/`
   - Edge Functions modificadas: `git diff --name-only HEAD@{1} HEAD -- supabase/functions/`
   - `.env.example` mudou? Se sim, listar diff.

### Sequência

#### 1. Aplicar migrations novas

Para cada arquivo em `supabase/migrations/*.sql` que **não foi aplicado anteriormente** (na prática, todos os arquivos novos detectados pelo git diff acima):

```bash
SUPABASE_ACCESS_TOKEN={TOKEN} node scripts/run-migration.mjs {PROJECT_REF} {file}
```

Onde `{TOKEN}` e `{PROJECT_REF}` saem do `.env.local`.

> Este projeto não tem npm script `db:push` — use `node scripts/run-migration.mjs` direto.

Mostrar saída de cada uma. Em erro, **parar** e pedir orientação ao aluno antes de prosseguir.

#### 2. Redeploy de Edge Functions

Para cada slug em `supabase/functions/*/` que mudou (ou todos, se for mais simples — o redeploy é idempotente):

```bash
SUPABASE_ACCESS_TOKEN={TOKEN} node scripts/deploy-function.mjs {PROJECT_REF} {slug}
```

Pular slugs que começam com `_`. Mostrar saída.

Em erro, tentar individualmente as que falharam e reportar quais ficaram.

#### 3. Verificar secrets necessárias

Ler `.env.example` na seção "EDGE FUNCTIONS SECRETS" e listar para o aluno quais secrets esse projeto requer.

Para cada secret listada:
- Tentar consultar via Management API se já está configurada:
  ```bash
  curl -s "https://api.supabase.com/v1/projects/{PROJECT_REF}/secrets" \
    -H "Authorization: Bearer {ACCESS_TOKEN}"
  ```
- Se uma secret nova (que não existia na versão anterior) ainda não está configurada, perguntar ao aluno:
  - "Quer configurar `[NOME_SECRET]` agora? Use para: `[descrição do .env.example]`. Obtenha em: `[link do .env.example]`."
  - Se sim → pedir o valor → configurar via:
    ```bash
    curl -X PATCH "https://api.supabase.com/v1/projects/{PROJECT_REF}/secrets" \
      -H "Authorization: Bearer {ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '[{"name":"NOME","value":"VALOR"}]'
    ```
  - Se não → avisar que features que dependem dessa secret ficam offline até ele configurar manualmente em Supabase Dashboard → Edge Functions → Secrets.

#### 4. Resumo final

Mostrar:

```
✅ Update concluído!

📊 Aplicado:
- Migrations novas: N (lista)
- Edge Functions redeployadas: N (lista)
- Secrets configuradas: N (lista)

📋 O que pode ter mudado:
- [se houver migrations novas] Novas tabelas/colunas/triggers — verifique se a UI ainda funciona
- [se houver functions modificadas] Comportamento de backend pode ter mudado
- O frontend redeploya automaticamente quando você der git push na sua main (Vercel detecta)

⚠️  Se algo quebrou:
- Verifique logs em Supabase Dashboard → Edge Functions → [função] → Logs
- Verifique logs em Vercel → Deployments → último deploy
```

### Tratamento de erros

- Migration falha → mostrar erro completo, **NÃO continuar** para Edge Functions, pedir orientação.
- Edge Function falha → tentar deployar individualmente as que falharam, reportar quais ficaram.
- Sem permissão na Management API → pedir ao aluno verificar `SUPABASE_ACCESS_TOKEN` (escopo "All access" e ainda válido).

### Princípio

Você está mexendo em produção do aluno. Cuidado e transparência > velocidade.
