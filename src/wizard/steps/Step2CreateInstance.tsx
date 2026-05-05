import { useState } from "react";
import { Check, Zap } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StepFooter } from "@/wizard/StepFooter";
import { useWizard } from "@/wizard/WizardContext";
import { uazapi } from "@/lib/uazapi";
import { useAuth } from "@/auth/AuthContext";

export function Step2CreateInstance() {
  const { user } = useAuth();
  const { config, patchConfig, next } = useWizard();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyCreated = !!config?.instance_id;

  async function onCreate() {
    if (!config?.api_url || !config.api_token) {
      setError("Credenciais ausentes — volte ao step 1");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const name = `grupos-${user?.email?.split("@")[0] ?? "user"}`;
      if (import.meta.env.VITE_DEV_MODE === "true") {
        await patchConfig({ instance_id: `dev-${name}` });
      } else {
        const { instanceId } = await uazapi.createInstance(
          config.api_url,
          config.api_token,
          name
        );
        await patchConfig({ instance_id: instanceId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar instância");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Step 2 · Criar instância</CardTitle>
        <CardDescription>
          Vamos provisionar uma instância dedicada para seu WhatsApp na UAZAPI.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col items-center gap-4 py-6">
        {alreadyCreated ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-success/40 bg-success/10 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              <Check className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-ink-200">Instância criada</p>
            <code className="rounded-md bg-black/40 px-2 py-1 text-xs text-ink-400">
              {config?.instance_id}
            </code>
          </div>
        ) : (
          <Button onClick={onCreate} size="lg" disabled={busy}>
            <Zap className="h-4 w-4" />
            {busy ? "Criando…" : "Criar instância"}
          </Button>
        )}
      </div>

      <StepFooter
        onNext={() => next()}
        nextDisabled={!alreadyCreated}
        busy={busy}
        error={error}
      />
    </>
  );
}
