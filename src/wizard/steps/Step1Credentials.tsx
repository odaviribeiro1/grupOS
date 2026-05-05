import { useState } from "react";
import { Input, Label } from "@/components/ui/Input";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StepFooter } from "@/wizard/StepFooter";
import { useWizard } from "@/wizard/WizardContext";
import { uazapi } from "@/lib/uazapi";
import { useAuth } from "@/auth/AuthContext";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

export function Step1Credentials() {
  const { user } = useAuth();
  const { config, patchConfig, next } = useWizard();
  const [apiUrl, setApiUrl, clearApiUrl] = useLocalStorageState<string>(
    `grupos:wizard:${user?.id ?? "anon"}:step1:apiUrl`,
    config?.api_url ?? ""
  );
  const [apiToken, setApiToken, clearApiToken] = useLocalStorageState<string>(
    `grupos:wizard:${user?.id ?? "anon"}:step1:apiToken`,
    config?.api_token ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^https?:\/\/\S+/i.test(apiUrl.trim()) && apiToken.trim().length > 0;

  async function onContinue() {
    setError(null);
    setBusy(true);
    try {
      if (import.meta.env.VITE_DEV_MODE !== "true") {
        await uazapi.validateCredentials(apiUrl, apiToken);
      }
      await patchConfig({
        api_url: apiUrl.trim().replace(/\/+$/, ""),
        api_token: apiToken.trim(),
      });
      // Credenciais agora vivem no config — limpa draft sensível.
      clearApiUrl();
      clearApiToken();
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao validar credenciais");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Step 1 · Credenciais UAZAPI</CardTitle>
        <CardDescription>
          Informe a URL base da sua UAZAPI e o token de administrador. Eles
          serão usados para criar a instância no próximo passo.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apiUrl">URL da UAZAPI</Label>
          <Input
            id="apiUrl"
            placeholder="https://api.uazapi.com"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
          <span className="text-[11px] text-ink-400">
            Deve começar com http:// ou https://
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apiToken">Token de administrador</Label>
          <Input
            id="apiToken"
            type="password"
            placeholder="admin token"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
          />
        </div>
      </div>

      <StepFooter
        onNext={onContinue}
        nextDisabled={!valid}
        busy={busy}
        error={error}
      />
    </>
  );
}
